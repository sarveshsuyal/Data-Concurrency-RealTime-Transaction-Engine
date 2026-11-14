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
    is_primary = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.account_number} ({self.user.email}) - {self.currency} {self.balance}"

    @classmethod
    def get_system_clearing_account(cls):
        """
        Returns or provisions the authoritative system clearing account for double-entry balance preservation.
        Used as the offsetting leg for external funding, opening deposits, and admin adjustments.
        """
        from authentication.models import User
        admin_user = User.objects.filter(role=User.Role.ADMIN).first()
        if not admin_user:
            admin_user = User.objects.filter(is_superuser=True).first()
        if not admin_user:
            admin_user = User.objects.create_user(
                email="system@datacore.internal",
                full_name="DataCore System Clearing",
                role=User.Role.ADMIN
            )
        account, _ = cls.objects.get_or_create(
            account_number="SYS-CLEARING-001",
            defaults={
                "user": admin_user,
                "currency": "INR",
                "balance": Decimal('0.00'),
                "is_active": True,
                "is_primary": False
            }
        )
        return account


class Transaction(models.Model):
    """Core transaction entity."""
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        COMPLETED = 'COMPLETED', 'Completed'
        FAILED = 'FAILED', 'Failed'
        ROLLED_BACK = 'ROLLED_BACK', 'Rolled Back'

    class ConcurrencyStrategy(models.TextChoices):
        PESSIMISTIC = 'PESSIMISTIC', 'Pessimistic Locking'
        OPTIMISTIC = 'OPTIMISTIC', 'Optimistic Locking'
        ATOMIC_CONDITIONAL = 'ATOMIC_CONDITIONAL', 'Atomic Conditional Update'
        UNSAFE_BASELINE = 'UNSAFE_BASELINE', 'Unsafe Baseline (Lab Only)'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
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
    """System-wide audit trail."""
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
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.timestamp} | {self.action} by {self.user}"


class AccountAdjustment(models.Model):
    """
    Authoritative manual credit or debit adjustment performed by an administrator.
    Every adjustment strictly writes balanced double-entry ledger records against
    the system clearing account to guarantee zero-sum money conservation.
    """
    class Operation(models.TextChoices):
        CREDIT = 'CREDIT', 'Credit'
        DEBIT = 'DEBIT', 'Debit'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.ForeignKey(
        Account,
        on_delete=models.PROTECT,
        related_name='adjustments'
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='executed_adjustments'
    )
    operation = models.CharField(max_length=10, choices=Operation.choices)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    currency = models.CharField(max_length=3, default='INR')
    previous_balance = models.DecimalField(max_digits=14, decimal_places=2)
    resulting_balance = models.DecimalField(max_digits=14, decimal_places=2)
    reason_code = models.CharField(max_length=64)
    admin_note = models.TextField()
    idempotency_key = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Adjustment {self.id} | {self.operation} {self.currency} {self.amount} -> {self.account.account_number}"
