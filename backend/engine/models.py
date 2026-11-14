import uuid
import secrets
from decimal import Decimal
from django.db import models
from django.conf import settings
from django.utils import timezone

def generate_account_number():
    """Generate friendly account identifier e.g. DC-7489-1024."""
    part1 = secrets.randbelow(9000) + 1000
    part2 = secrets.randbelow(9000) + 1000
    return f"DC-{part1}-{part2}"

class Account(models.Model):
    """Authoritative ledger account."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account_number = models.CharField(
        max_length=32,
        unique=True,
        default=generate_account_number,
        db_index=True
    )
    upi_id = models.CharField(
        max_length=128,
        unique=True,
        null=True,
        blank=True,
        db_index=True
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='accounts'
    )
    balance = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('0.00')
    )
    currency = models.CharField(max_length=3, default='INR')
    version = models.PositiveIntegerField(default=0)  # For optimistic locking
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.account_number} ({self.user.email}) - {self.currency} {self.balance}"


class Transaction(models.Model):
    """Core transaction entity."""
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        PROCESSING = 'PROCESSING', 'Processing'
        COMPLETED = 'COMPLETED', 'Completed'
        SUCCESS = 'SUCCESS', 'Success'
        FAILED = 'FAILED', 'Failed'
        ROLLED_BACK = 'ROLLED_BACK', 'Rolled Back'
        REVERSED = 'REVERSED', 'Reversed'

    class ConcurrencyStrategy(models.TextChoices):
        PESSIMISTIC = 'PESSIMISTIC', 'Pessimistic Locking'
        OPTIMISTIC = 'OPTIMISTIC', 'Optimistic Locking'
        ATOMIC_CONDITIONAL = 'ATOMIC_CONDITIONAL', 'Atomic Conditional Update'
        UNSAFE_BASELINE = 'UNSAFE_BASELINE', 'Unsafe Baseline (Lab Only)'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    correlation_id = models.UUIDField(default=uuid.uuid4, editable=False, db_index=True)
    sender_account = models.ForeignKey(
        Account,
        on_delete=models.PROTECT,
        related_name='sent_transactions',
        null=True,
        blank=True
    )
    receiver_account = models.ForeignKey(
        Account,
        on_delete=models.PROTECT,
        related_name='received_transactions'
    )
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    currency = models.CharField(max_length=3, default='INR')
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True
    )
    concurrency_strategy = models.CharField(
        max_length=30,
        choices=ConcurrencyStrategy.choices,
        default=ConcurrencyStrategy.PESSIMISTIC
    )
    idempotency_key = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    description = models.TextField(blank=True)
    failure_reason = models.TextField(blank=True)
    latency_ms = models.FloatField(default=0.0)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        sender = self.sender_account.account_number if self.sender_account else 'SYSTEM_DEPOSIT'
        return f"{self.id} | {sender} -> {self.receiver_account.account_number} | {self.currency} {self.amount} [{self.status}]"


class LedgerEntry(models.Model):
    """
    Immutable double-entry ledger entry.
    Every completed transfer must have matching DEBIT and CREDIT entries.
    """
    class EntryType(models.TextChoices):
        DEBIT = 'DEBIT', 'Debit (Subtraction)'
        CREDIT = 'CREDIT', 'Credit (Addition)'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    transaction = models.ForeignKey(
        Transaction,
        on_delete=models.PROTECT,
        related_name='ledger_entries',
        null=True,
        blank=True
    )
    account = models.ForeignKey(
        Account,
        on_delete=models.PROTECT,
        related_name='ledger_entries'
    )
    entry_type = models.CharField(max_length=10, choices=EntryType.choices, db_index=True)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    balance_after = models.DecimalField(max_digits=14, decimal_places=2)
    description = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.entry_type} {self.amount} -> {self.account.account_number} (Bal: {self.balance_after})"


class IdempotencyKey(models.Model):
    """Stores client request idempotency fingerprints to protect against duplicate submissions."""
    class Status(models.TextChoices):
        PROCESSING = 'PROCESSING', 'Processing'
        COMPLETED = 'COMPLETED', 'Completed'
        FAILED = 'FAILED', 'Failed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    key = models.CharField(max_length=255, db_index=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='idempotency_keys'
    )
    request_path = models.CharField(max_length=255)
    request_hash = models.CharField(max_length=64)  # SHA-256 hex digest
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PROCESSING
    )
    response_code = models.IntegerField(null=True, blank=True)
    response_body = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['user', 'key'], name='unique_user_idempotency_key')
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"IdempotencyKey({self.user.email}, {self.key}) [{self.status}]"


class TransactionEvent(models.Model):
    """Auditable lifecycle and concurrency events."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    transaction = models.ForeignKey(
        Transaction,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='events'
    )
    event_type = models.CharField(max_length=50, db_index=True)
    details = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Event: {self.event_type} at {self.created_at}"


class ConcurrencyExperiment(models.Model):
    """Record of controlled concurrency experiments run in the Race-Condition Lab."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    experiment_name = models.CharField(max_length=255)
    strategy = models.CharField(max_length=50)
    initial_balance = models.DecimalField(max_digits=14, decimal_places=2)
    concurrent_requests_count = models.IntegerField(default=2)
    successful_count = models.IntegerField(default=0)
    failed_count = models.IntegerField(default=0)
    final_balance = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    expected_balance = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    invariants_preserved = models.BooleanField(default=True)
    duration_ms = models.FloatField(default=0.0)
    logs = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        status = "PASSED" if self.invariants_preserved else "FAILED_INVARIANT"
        return f"Lab: {self.experiment_name} ({self.strategy}) -> {status}"


class AuditLog(models.Model):
    """System-wide audit trail with tamper-evident cryptographic chaining."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs'
    )
    action = models.CharField(max_length=100, db_index=True)
    ip_address = models.CharField(max_length=50, null=True, blank=True)
    user_agent = models.TextField(blank=True)
    details = models.JSONField(default=dict)
    previous_hash = models.CharField(max_length=64, blank=True, default='')
    current_hash = models.CharField(max_length=64, blank=True, default='', db_index=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.timestamp} | {self.action} by {self.user}"


# =========================================================================
# Enterprise Multi-Tenant Hierarchy
# =========================================================================

class Organization(models.Model):
    """Top-level enterprise tenant entity."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Workspace(models.Model):
    """Isolated operational workspace within an organization."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='workspaces',
        null=True,
        blank=True
    )
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255)
    environment = models.CharField(max_length=50, default='Production')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.environment})"


class WorkspaceMembership(models.Model):
    """Assigns user access roles within an isolated workspace."""
    class Role(models.TextChoices):
        OWNER = 'OWNER', 'Owner'
        ADMIN = 'ADMIN', 'Admin'
        MEMBER = 'MEMBER', 'Member'
        VIEWER = 'VIEWER', 'Viewer'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE, related_name='memberships')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='workspace_memberships')
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.MEMBER)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('workspace', 'user')


# =========================================================================
# Developer Platform: API Keys & Webhooks
# =========================================================================

class ApiKey(models.Model):
    """Scoped developer API keys stored using secure SHA-256 digests."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='api_keys')
    workspace = models.ForeignKey(Workspace, on_delete=models.SET_NULL, null=True, blank=True, related_name='api_keys')
    name = models.CharField(max_length=255)
    prefix = models.CharField(max_length=24, db_index=True)
    hashed_key = models.CharField(max_length=128)
    scopes = models.JSONField(default=list)  # e.g., ["read:transactions", "write:transfers"]
    is_active = models.BooleanField(default=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.prefix}...)"


class WebhookEndpoint(models.Model):
    """Subscribed webhook endpoint with HMAC signature secret."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='webhook_endpoints')
    workspace = models.ForeignKey(Workspace, on_delete=models.SET_NULL, null=True, blank=True, related_name='webhooks')
    url = models.URLField()
    secret = models.CharField(max_length=128)
    events = models.JSONField(default=list)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Webhook: {self.url}"


class WebhookDelivery(models.Model):
    """Record of individual webhook delivery attempts and HMAC signatures."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    endpoint = models.ForeignKey(WebhookEndpoint, on_delete=models.CASCADE, related_name='deliveries')
    event_type = models.CharField(max_length=100)
    payload = models.JSONField()
    status = models.CharField(max_length=20, default='SUCCESS')
    status_code = models.IntegerField(default=200)
    duration_ms = models.FloatField(default=0.0)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']


# =========================================================================
# Incident Management & Anomaly Detection
# =========================================================================

class Incident(models.Model):
    """Platform incident lifecycle: Detected -> Acknowledged -> Investigating -> Resolved -> Closed."""
    class Severity(models.TextChoices):
        LOW = 'LOW', 'Low'
        MEDIUM = 'MEDIUM', 'Medium'
        HIGH = 'HIGH', 'High'
        CRITICAL = 'CRITICAL', 'Critical'

    class Status(models.TextChoices):
        DETECTED = 'DETECTED', 'Detected'
        ACKNOWLEDGED = 'ACKNOWLEDGED', 'Acknowledged'
        INVESTIGATING = 'INVESTIGATING', 'Investigating'
        RESOLVED = 'RESOLVED', 'Resolved'
        CLOSED = 'CLOSED', 'Closed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField()
    severity = models.CharField(max_length=20, choices=Severity.choices, default=Severity.MEDIUM)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DETECTED)
    affected_service = models.CharField(max_length=100, default='Transaction Engine')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.severity}] {self.title} ({self.status})"


class AnomalyRule(models.Model):
    """Rule definition for automated risk and abnormal transaction detection."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    rule_type = models.CharField(max_length=50)  # RAPID_TRANSACTIONS, HIGH_AMOUNT, REPEATED_FAILURES
    threshold = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('10000.00'))
    severity = models.CharField(max_length=20, default='HIGH')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.rule_type})"


class AnomalyAlert(models.Model):
    """Triggered anomaly detection alerts."""
    class Status(models.TextChoices):
        OPEN = 'OPEN', 'Open'
        RESOLVED = 'RESOLVED', 'Resolved'
        FALSE_POSITIVE = 'FALSE_POSITIVE', 'False Positive'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    rule = models.ForeignKey(AnomalyRule, on_delete=models.CASCADE, related_name='alerts', null=True, blank=True)
    transaction = models.ForeignKey(Transaction, on_delete=models.SET_NULL, null=True, blank=True, related_name='anomaly_alerts')
    title = models.CharField(max_length=255)
    details = models.JSONField(default=dict)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']


# =========================================================================
# Reliability Objectives (SLO) & Financial Settlement
# =========================================================================

class ReliabilityObjective(models.Model):
    """SLO target definitions and rolling error budget burn metrics."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    target_percentage = models.FloatField(default=99.9)
    current_value = models.FloatField(default=99.95)
    error_budget_consumed = models.FloatField(default=12.4)
    time_window = models.CharField(max_length=50, default='30d')
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name}: {self.current_value}% / {self.target_percentage}%"


class SettlementBatch(models.Model):
    """Internal ledger settlement batch for accounting reconciliation."""
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        SETTLED = 'SETTLED', 'Settled'
        FAILED = 'FAILED', 'Failed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    batch_number = models.CharField(max_length=64, unique=True)
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    currency = models.CharField(max_length=3, default='INR')
    transaction_count = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SETTLED)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    settled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Batch {self.batch_number} [{self.status}]"


class Notification(models.Model):
    """In-app notifications for alerts and system events."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications', null=True, blank=True)
    title = models.CharField(max_length=255)
    message = models.TextField()
    category = models.CharField(max_length=50, default='SYSTEM')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']


class OutboxEvent(models.Model):
    """Transactional Outbox for reliable asynchronous event publishing."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event_type = models.CharField(max_length=100, db_index=True)
    aggregate_type = models.CharField(max_length=100)
    aggregate_id = models.CharField(max_length=255)
    payload = models.JSONField()
    status = models.CharField(max_length=20, default='PENDING', db_index=True)
    retry_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']


class BenchmarkRecord(models.Model):
    """Persisted performance and latency measurements."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workload_type = models.CharField(max_length=100)
    strategy = models.CharField(max_length=50)
    worker_count = models.IntegerField(default=4)
    iterations = models.IntegerField(default=50)
    tps = models.FloatField(default=0.0)
    avg_latency_ms = models.FloatField(default=0.0)
    p95_latency_ms = models.FloatField(default=0.0)
    p99_latency_ms = models.FloatField(default=0.0)
    conflict_rate = models.FloatField(default=0.0)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']

