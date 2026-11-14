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
    AccountAdjustment
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
        fields = ('id', 'user_email', 'action', 'ip_address', 'user_agent', 'details', 'timestamp')
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


class AdjustmentRequestSerializer(serializers.Serializer):
    operation = serializers.ChoiceField(choices=['credit', 'debit', 'CREDIT', 'DEBIT'])
    amount = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal('0.01'))
    currency = serializers.CharField(max_length=3, default='INR')
    reason_code = serializers.CharField(max_length=64)
    admin_note = serializers.CharField(max_length=1000)


class AccountAdjustmentSerializer(serializers.ModelSerializer):
    account_number = serializers.CharField(source='account.account_number', read_only=True)
    actor_email = serializers.EmailField(source='actor.email', read_only=True, allow_null=True)

    class Meta:
        model = AccountAdjustment
        fields = (
            'id',
            'account',
            'account_number',
            'actor_email',
            'operation',
            'amount',
            'currency',
            'previous_balance',
            'resulting_balance',
            'reason_code',
            'admin_note',
            'idempotency_key',
            'created_at'
        )
        read_only_fields = fields
