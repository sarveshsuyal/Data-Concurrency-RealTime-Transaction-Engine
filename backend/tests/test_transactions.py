from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from authentication.models import User
from engine.models import Account, Transaction, LedgerEntry

class TransactionAndLedgerTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Sender User & Account
        self.sender_user = User.objects.create_user(
            email='sender@test.com',
            password='Password123!',
            full_name='Sender User'
        )
        self.sender_account = Account.objects.create(
            user=self.sender_user,
            balance=Decimal('2000.00'),
            currency='INR'
        )

        # Receiver User & Account
        self.receiver_user = User.objects.create_user(
            email='receiver@test.com',
            password='Password123!',
            full_name='Receiver User'
        )
        self.receiver_account = Account.objects.create(
            user=self.receiver_user,
            balance=Decimal('500.00'),
            currency='INR'
        )

        # Authenticate as sender
        self.client.force_authenticate(user=self.sender_user)
        self.tx_url = '/api/transactions/'

    def test_successful_transfer_and_ledger_double_entry(self):
        """Test transfer executes atomically and produces balanced double-entry ledger records."""
        payload = {
            'sender_account_id': str(self.sender_account.id),
            'receiver_identifier': self.receiver_account.account_number,
            'amount': '400.00',
            'description': 'Test payment'
        }
        response = self.client.post(self.tx_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.sender_account.refresh_from_db()
        self.receiver_account.refresh_from_db()

        # Check balances
        self.assertEqual(self.sender_account.balance, Decimal('1600.00'))
        self.assertEqual(self.receiver_account.balance, Decimal('900.00'))

        # Check transaction record
        tx = Transaction.objects.get(id=response.data['id'])
        self.assertEqual(tx.status, Transaction.Status.COMPLETED)
        self.assertEqual(tx.amount, Decimal('400.00'))

        # Check double-entry ledger entries
        entries = list(tx.ledger_entries.all())
        self.assertEqual(len(entries), 2)

        debit = next(e for e in entries if e.entry_type == LedgerEntry.EntryType.DEBIT)
        credit = next(e for e in entries if e.entry_type == LedgerEntry.EntryType.CREDIT)

        self.assertEqual(debit.account, self.sender_account)
        self.assertEqual(debit.amount, Decimal('400.00'))
        self.assertEqual(debit.balance_after, Decimal('1600.00'))

        self.assertEqual(credit.account, self.receiver_account)
        self.assertEqual(credit.amount, Decimal('400.00'))
        self.assertEqual(credit.balance_after, Decimal('900.00'))

        # Mathematical Invariant: Debits == Credits
        self.assertEqual(debit.amount, credit.amount)

    def test_transfer_using_upi_id(self):
        """Test transfer executes successfully when recipient is identified by generated UPI ID."""
        self.receiver_account.upi_id = 'receiver@dc'
        self.receiver_account.save()

        payload = {
            'sender_account_id': str(self.sender_account.id),
            'receiver_identifier': 'receiver@dc',
            'amount': '250.00',
            'description': 'UPI transfer test'
        }
        response = self.client.post(self.tx_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.sender_account.refresh_from_db()
        self.receiver_account.refresh_from_db()
        self.assertEqual(self.sender_account.balance, Decimal('1750.00'))
        self.assertEqual(self.receiver_account.balance, Decimal('750.00'))

    def test_insufficient_funds_rollback(self):
        """Test insufficient funds causes complete rollback with zero ledger entries."""
        payload = {
            'sender_account_id': str(self.sender_account.id),
            'receiver_identifier': self.receiver_account.account_number,
            'amount': '5000.00',  # Exceeds 2000.00 balance
            'description': 'Overdraft attempt'
        }
        response = self.client.post(self.tx_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        self.sender_account.refresh_from_db()
        self.receiver_account.refresh_from_db()

        # Balances must be untouched
        self.assertEqual(self.sender_account.balance, Decimal('2000.00'))
        self.assertEqual(self.receiver_account.balance, Decimal('500.00'))

        # Zero ledger entries created
        self.assertEqual(LedgerEntry.objects.count(), 0)

    def test_idempotency_key_duplicate_prevention(self):
        """Duplicate request with same idempotency key must not execute twice."""
        payload = {
            'sender_account_id': str(self.sender_account.id),
            'receiver_identifier': self.receiver_account.account_number,
            'amount': '300.00',
            'description': 'Idempotent transfer'
        }
        idempotency_headers = {'HTTP_IDEMPOTENCY_KEY': 'unique-idem-key-12345'}

        # First request
        resp1 = self.client.post(self.tx_url, payload, format='json', **idempotency_headers)
        self.assertEqual(resp1.status_code, status.HTTP_201_CREATED)

        self.sender_account.refresh_from_db()
        self.assertEqual(self.sender_account.balance, Decimal('1700.00'))

        # Second request (duplicate submission)
        resp2 = self.client.post(self.tx_url, payload, format='json', **idempotency_headers)
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertEqual(resp1.data['id'], resp2.data['id'])

        # Balance must STILL be 1700.00, NOT 1400.00!
        self.sender_account.refresh_from_db()
        self.assertEqual(self.sender_account.balance, Decimal('1700.00'))

    def test_idempotency_key_reuse_different_payload_rejected(self):
        """Reusing same idempotency key with different payload must be rejected with 400 Bad Request."""
        payload1 = {
            'sender_account_id': str(self.sender_account.id),
            'receiver_identifier': self.receiver_account.account_number,
            'amount': '100.00',
        }
        payload2 = {
            'sender_account_id': str(self.sender_account.id),
            'receiver_identifier': self.receiver_account.account_number,
            'amount': '999.00',  # Different amount!
        }
        headers = {'HTTP_IDEMPOTENCY_KEY': 'tampered-key-999'}

        resp1 = self.client.post(self.tx_url, payload1, format='json', **headers)
        self.assertEqual(resp1.status_code, status.HTTP_201_CREATED)

        resp2 = self.client.post(self.tx_url, payload2, format='json', **headers)
        self.assertEqual(resp2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("different request payload", resp2.data['detail'])
