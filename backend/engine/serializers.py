from rest_framework import serializers
from decimal import Decimal
from .models import (
    Account,
    Transaction,
    LedgerEntry,
    IdempotencyKey,
    TransactionEvent,
    ConcurrencyExperiment,
    AuditLog,
    Organization,
    Workspace,
    WorkspaceMembership,
    ApiKey,
    WebhookEndpoint,
    WebhookDelivery,
    Incident,
    AnomalyRule,
    AnomalyAlert,
    ReliabilityObjective,
    SettlementBatch,
    Notification,
    OutboxEvent,
    BenchmarkRecord
)
from authentication.models import User

class AccountSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.full_name', read_only=True)

    class Meta:
        model = Account
        fields = (
            'id',
            'account_number',
            'upi_id',
            'user_email',
            'user_name',
            'balance',
            'currency',
            'version',
            'is_active',
            'created_at',
            'updated_at'
        )
        read_only_fields = fields


class LedgerEntrySerializer(serializers.ModelSerializer):
    account_number = serializers.CharField(source='account.account_number', read_only=True)
    transaction_id = serializers.UUIDField(source='transaction.id', read_only=True, allow_null=True)

    class Meta:
        model = LedgerEntry
        fields = (
            'id',
            'transaction_id',
            'account_number',
            'entry_type',
            'amount',
            'balance_after',
            'description',
            'created_at'
        )
        read_only_fields = fields


class TransactionSerializer(serializers.ModelSerializer):
    sender_account_number = serializers.CharField(
        source='sender_account.account_number',
        read_only=True,
        default='SYSTEM_DEPOSIT'
    )
    receiver_account_number = serializers.CharField(
        source='receiver_account.account_number',
        read_only=True
    )
    sender_email = serializers.EmailField(
        source='sender_account.user.email',
        read_only=True,
        default='system@datacore.io'
    )
    receiver_email = serializers.EmailField(
        source='receiver_account.user.email',
        read_only=True
    )
    ledger_entries = LedgerEntrySerializer(many=True, read_only=True)

    class Meta:
        model = Transaction
        fields = (
            'id',
            'correlation_id',
            'sender_account',
            'sender_account_number',
            'sender_email',
            'receiver_account',
            'receiver_account_number',
            'receiver_email',
            'amount',
            'currency',
            'status',
            'concurrency_strategy',
            'idempotency_key',
            'description',
            'failure_reason',
            'latency_ms',
            'created_at',
            'completed_at',
            'ledger_entries'
        )
        read_only_fields = fields


class TransferRequestSerializer(serializers.Serializer):
    """Input serializer for client transfer requests."""
    sender_account_id = serializers.UUIDField(required=False, allow_null=True)
    receiver_identifier = serializers.CharField(
        required=True,
        help_text="Recipient Account Number (e.g. DC-1234-5678) or Registered Email Address"
    )
    amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal('0.01'))
    description = serializers.CharField(required=False, allow_blank=True, default="")
    concurrency_strategy = serializers.ChoiceField(
        choices=Transaction.ConcurrencyStrategy.choices,
        default=Transaction.ConcurrencyStrategy.PESSIMISTIC
    )

    def validate_receiver_identifier(self, value):
        value = value.strip()
        account = Account.objects.filter(account_number=value).first()
        if not account:
            account = Account.objects.filter(upi_id__iexact=value).first()
        if not account:
            user = User.objects.filter(email=value).first()
            if user:
                account = Account.objects.filter(user=user, is_active=True).first()
        if not account:
            raise serializers.ValidationError("Recipient account or user not found.")
        return account.id


class TransactionEventSerializer(serializers.ModelSerializer):
    transaction_id = serializers.UUIDField(source='transaction.id', read_only=True, allow_null=True)

    class Meta:
        model = TransactionEvent
        fields = ('id', 'transaction_id', 'event_type', 'details', 'created_at')
        read_only_fields = fields


class ConcurrencyExperimentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConcurrencyExperiment
        fields = (
            'id',
            'experiment_name',
            'strategy',
            'initial_balance',
            'concurrent_requests_count',
            'successful_count',
            'failed_count',
            'final_balance',
            'expected_balance',
            'invariants_preserved',
            'duration_ms',
            'logs',
            'created_at'
        )
        read_only_fields = fields


class RunExperimentRequestSerializer(serializers.Serializer):
    strategy = serializers.ChoiceField(
        choices=Transaction.ConcurrencyStrategy.choices,
        default=Transaction.ConcurrencyStrategy.PESSIMISTIC
    )
    initial_balance = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal('1000.00'),
        min_value=Decimal('10.00')
    )
    withdrawals = serializers.ListField(
        child=serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal('1.00')),
        default=[Decimal('700.00'), Decimal('500.00')]
    )


class AuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True, allow_null=True)

    class Meta:
        model = AuditLog
        fields = (
            'id',
            'user_email',
            'action',
            'ip_address',
            'user_agent',
            'details',
            'previous_hash',
            'current_hash',
            'timestamp'
        )
        read_only_fields = fields


class IdempotencyKeySerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = IdempotencyKey
        fields = (
            'id',
            'key',
            'user_email',
            'request_path',
            'request_hash',
            'status',
            'response_code',
            'response_body',
            'created_at',
            'updated_at'
        )
        read_only_fields = fields


# =========================================================================
# Enterprise Domain Serializers
# =========================================================================

class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = '__all__'
        read_only_fields = ('id', 'created_at')


class WorkspaceSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source='organization.name', read_only=True, default='')

    class Meta:
        model = Workspace
        fields = '__all__'
        read_only_fields = ('id', 'created_at')


class ApiKeySerializer(serializers.ModelSerializer):
    class Meta:
        model = ApiKey
        fields = ('id', 'name', 'prefix', 'scopes', 'is_active', 'expires_at', 'last_used_at', 'created_at')
        read_only_fields = ('id', 'prefix', 'last_used_at', 'created_at')


class WebhookEndpointSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebhookEndpoint
        fields = ('id', 'url', 'secret', 'events', 'is_active', 'created_at')
        read_only_fields = ('id', 'created_at')


class WebhookDeliverySerializer(serializers.ModelSerializer):
    endpoint_url = serializers.CharField(source='endpoint.url', read_only=True)

    class Meta:
        model = WebhookDelivery
        fields = '__all__'
        read_only_fields = fields


class IncidentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Incident
        fields = '__all__'
        read_only_fields = ('id', 'created_at')


class AnomalyRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnomalyRule
        fields = '__all__'
        read_only_fields = ('id', 'created_at')


class AnomalyAlertSerializer(serializers.ModelSerializer):
    rule_name = serializers.CharField(source='rule.name', read_only=True, default='')

    class Meta:
        model = AnomalyAlert
        fields = '__all__'
        read_only_fields = ('id', 'created_at')


class ReliabilityObjectiveSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReliabilityObjective
        fields = '__all__'
        read_only_fields = ('id', 'updated_at')


class SettlementBatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = SettlementBatch
        fields = '__all__'
        read_only_fields = ('id', 'created_at')


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'
        read_only_fields = ('id', 'created_at')


class OutboxEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = OutboxEvent
        fields = '__all__'
        read_only_fields = ('id', 'created_at')


class BenchmarkRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = BenchmarkRecord
        fields = '__all__'
        read_only_fields = fields

