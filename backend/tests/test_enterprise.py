import json
import hashlib
from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from authentication.models import User
from engine.models import (
    Account,
    Transaction,
    LedgerEntry,
    AuditLog,
    ApiKey,
    WebhookEndpoint,
    WebhookDelivery,
    Incident,
    AnomalyRule,
    AnomalyAlert,
    ReliabilityObjective,
    SettlementBatch
)
from engine.services import (
    TransferService,
    AuditLogService,
    WebhookService,
    AnomalyService,
    BenchmarkService
)
from engine.concurrency import (
    ConcurrencyStrategyHandler,
    RetryStormSimulator,
    CircuitBreakerSimulator
)

class EnterprisePlatformTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Admin user
        self.admin = User.objects.create_superuser(
            email='admin@datacore.io',
            password='AdminPassword123!',
            full_name='Admin Lead'
        )

        # Customer 1
        self.alice = User.objects.create_user(
            email='alice@datacore.io',
            password='Password123!',
            full_name='Alice Johnson'
        )
        self.alice_account = Account.objects.create(
            user=self.alice,
            balance=Decimal('5000.00'),
            currency='INR'
        )

        # Customer 2
        self.bob = User.objects.create_user(
            email='bob@datacore.io',
            password='Password123!',
            full_name='Bob Smith'
        )
        self.bob_account = Account.objects.create(
            user=self.bob,
            balance=Decimal('2000.00'),
            currency='INR'
        )

        self.client.force_authenticate(user=self.admin)

    def test_reversal_creates_compensating_ledger_entries(self):
        """Test transaction reversal atomically restores balances and creates paired compensating ledger records."""
        # 1. Execute initial transfer Alice -> Bob 600
        tx_data, _ = TransferService.execute_transfer(
            user=self.alice,
            sender_account_id=self.alice_account.id,
            receiver_account_id=self.bob_account.id,
            amount=Decimal('600.00'),
            description='Initial payment'
        )
        tx = Transaction.objects.get(id=tx_data['id'])
        self.alice_account.refresh_from_db()
        self.bob_account.refresh_from_db()
        self.assertEqual(self.alice_account.balance, Decimal('4400.00'))
        self.assertEqual(self.bob_account.balance, Decimal('2600.00'))

        # 2. Reverse transfer
        rev_tx = TransferService.execute_reversal(
            user=self.admin,
            transaction_id=tx.id,
            reason='Customer requested refund'
        )
        self.assertEqual(rev_tx.status, Transaction.Status.REVERSED)

        self.alice_account.refresh_from_db()
        self.bob_account.refresh_from_db()

        # Balances returned to original state
        self.assertEqual(self.alice_account.balance, Decimal('5000.00'))
        self.assertEqual(self.bob_account.balance, Decimal('2000.00'))

        # Check compensating ledger entries: 2 initial + 2 reversal = 4 total
        entries = list(tx.ledger_entries.all())
        self.assertEqual(len(entries), 4)

        debit_entries = [e for e in entries if e.entry_type == LedgerEntry.EntryType.DEBIT]
        credit_entries = [e for e in entries if e.entry_type == LedgerEntry.EntryType.CREDIT]
        self.assertEqual(len(debit_entries), 2)
        self.assertEqual(len(credit_entries), 2)

        # Invariant maintained: Sum(Debits) == Sum(Credits)
        sum_debits = sum(e.amount for e in debit_entries)
        sum_credits = sum(e.amount for e in credit_entries)
        self.assertEqual(sum_debits, sum_credits)

    def test_reversing_already_reversed_fails(self):
        """Verify duplicate reversal attempts are rejected."""
        tx_data, _ = TransferService.execute_transfer(
            user=self.alice,
            sender_account_id=self.alice_account.id,
            receiver_account_id=self.bob_account.id,
            amount=Decimal('300.00')
        )
        TransferService.execute_reversal(user=self.admin, transaction_id=tx_data['id'])
        with self.assertRaises(ValueError):
            TransferService.execute_reversal(user=self.admin, transaction_id=tx_data['id'])

    def test_audit_log_cryptographic_hash_chaining(self):
        """Test audit logs maintain tamper-evident SHA-256 cryptographic chaining."""
        log1 = AuditLogService.log_action(user=self.admin, action='TEST_ACTION_1', details={'step': 1})
        log2 = AuditLogService.log_action(user=self.admin, action='TEST_ACTION_2', details={'step': 2})

        self.assertEqual(log2.previous_hash, log1.current_hash)
        self.assertTrue(len(log1.current_hash) == 64)
        self.assertTrue(len(log2.current_hash) == 64)

    def test_admin_consistency_verification_api(self):
        """Test consistency endpoint checks all invariants."""
        response = self.client.get('/api/admin/consistency/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('checks_summary', response.data)
        self.assertIn('invariants', response.data)
        self.assertEqual(response.data['invariants']['negative_balance_violations'], 0)
        self.assertTrue(response.data['invariants']['debit_credit_balanced'])

    def test_api_key_generation_and_storage(self):
        """Test developer API key generation returns raw secret once and stores SHA-256 hash."""
        response = self.client.post('/api/developer/keys/', {'name': 'Billing Bot', 'scopes': ['read:transactions']}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('secret_token', response.data)
        raw_secret = response.data['secret_token']
        self.assertTrue(raw_secret.startswith('dc_live_'))

        # Key in database has hashed value matching SHA-256
        key_obj = ApiKey.objects.get(id=response.data['id'])
        expected_hash = hashlib.sha256(raw_secret.encode('utf-8')).hexdigest()
        self.assertEqual(key_obj.hashed_key, expected_hash)

    def test_webhook_hmac_signature_dispatch(self):
        """Test webhook event delivery generates valid HMAC-SHA256 signature header."""
        ep = WebhookEndpoint.objects.create(
            user=self.admin,
            url='https://webhook.site/test',
            secret='whsec_super_secret_test_key_123',
            events=['transaction.completed']
        )
        deliveries = WebhookService.dispatch_event('transaction.completed', {'tx_id': '123', 'amount': '500'})
        self.assertEqual(len(deliveries), 1)
        deliv = deliveries[0]
        self.assertIn('_signature', deliv.payload)

        # Verify HMAC signature calculation
        import hmac
        payload_copy = dict(deliv.payload)
        sig = payload_copy.pop('_signature')
        payload_bytes = json.dumps(payload_copy, sort_keys=True).encode('utf-8')
        expected_sig = hmac.new(ep.secret.encode('utf-8'), payload_bytes, hashlib.sha256).hexdigest()
        self.assertEqual(sig, expected_sig)

    def test_circuit_breaker_simulator(self):
        """Test circuit breaker transitions to OPEN after consecutive failures."""
        result = CircuitBreakerSimulator.simulate_circuit_breaker(failure_threshold=3, total_requests=6)
        self.assertEqual(result['failure_threshold'], 3)
        history = result['history']
        self.assertEqual(history[0]['circuit_state'], 'CLOSED')
        # By request 4 (after 3 failures), circuit should have tripped
        self.assertIn('OPEN', [h['circuit_state'] for h in history])

    def test_retry_storm_simulator(self):
        """Test retry simulator calculates exponential delays."""
        result = RetryStormSimulator.simulate_retries(strategy='EXPONENTIAL', attempts=4, base_delay_ms=20)
        self.assertEqual(result['total_attempts'], 4)
        delays = [item['delay_ms'] for item in result['timeline']]
        # 20 * 2^0 = 20, 20 * 2^1 = 40, 20 * 2^2 = 80, 20 * 2^3 = 160
        self.assertEqual(delays, [20, 40, 80, 160])

    def test_incident_lifecycle_transitions(self):
        """Test incident state transitions from DETECTED to ACKNOWLEDGED to RESOLVED."""
        inc = Incident.objects.create(
            title='Test Spike',
            description='CPU spike on engine worker',
            severity='HIGH',
            status='DETECTED'
        )
        # Acknowledge
        resp1 = self.client.patch(f'/api/admin/incidents/{inc.id}/', {'status': 'ACKNOWLEDGED'}, format='json')
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)
        self.assertEqual(resp1.data['status'], 'ACKNOWLEDGED')

        # Resolve
        resp2 = self.client.patch(f'/api/admin/incidents/{inc.id}/', {'status': 'RESOLVED'}, format='json')
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertEqual(resp2.data['status'], 'RESOLVED')
        inc.refresh_from_db()
        self.assertIsNotNone(inc.resolved_at)
