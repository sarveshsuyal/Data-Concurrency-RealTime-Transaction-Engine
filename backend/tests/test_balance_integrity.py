from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from authentication.models import User
from engine.models import Account, LedgerEntry, Transaction
from engine.services import TransferService, ConcurrencyException

class BalanceIntegrityTests(TestCase):
    """
    Regression test suite verifying that account balances never reset to ₹10,000.00,
    zero balances persist across reads and sessions, and double-entry invariants hold.
    """

    def setUp(self):
        self.client = APIClient()
        self.system_clearing = Account.get_system_clearing_account()

        # Create test customer
        self.user = User.objects.create_user(
            email="zero.tester@datacore.io",
            full_name="Zero Tester",
            password="Password123!"
        )
        self.account = Account.objects.create(
            user=self.user,
            balance=Decimal('0.00'),
            currency='INR',
            version=0,
            is_primary=True
        )

        # Authenticate client
        login_resp = self.client.post(
            reverse('auth_login'),
            {'email': 'zero.tester@datacore.io', 'password': 'Password123!'}
        )
        self.token = login_resp.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')

    def test_zero_balance_persists_across_repeated_reads(self):
        """Verify that an account with 0.00 balance returns exactly 0.00 and never 10000.00."""
        for _ in range(5):
            response = self.client.get(reverse('account_list'))
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            results = response.data if isinstance(response.data, list) else response.data.get('results', [])
            self.assertTrue(len(results) > 0)
            primary = results[0]
            self.assertEqual(primary['balance'], '0.00')
            self.assertNotEqual(primary['balance'], '10000.00')

    def test_zero_balance_persists_after_re_login_and_profile_refresh(self):
        """Verify that logging out and logging back in never restores an initial 10k balance."""
        # Logout
        self.client.post(reverse('auth_logout'), {'refresh': self.client.post(reverse('auth_login'), {'email': self.user.email, 'password': 'Password123!'}).data['refresh']})
        self.client.credentials()

        # Re-login
        login_resp = self.client.post(reverse('auth_login'), {'email': self.user.email, 'password': 'Password123!'})
        new_token = login_resp.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {new_token}')

        # Check account balance
        acc_resp = self.client.get(reverse('account_list'))
        results = acc_resp.data if isinstance(acc_resp.data, list) else acc_resp.data.get('results', [])
        self.assertEqual(results[0]['balance'], '0.00')

    def test_overdraft_at_zero_is_strictly_rejected(self):
        """Verify that an account at 0.00 cannot execute an outbound transfer."""
        receiver = User.objects.create_user(email="rec@datacore.io", password="Password123!", full_name="Rec")
        rec_acc = Account.objects.create(user=receiver, balance=Decimal('100.00'), currency='INR')

        with self.assertRaises(Exception):
            TransferService.execute_transfer(
                user=self.user,
                sender_account_id=self.account.id,
                receiver_account_id=rec_acc.id,
                amount=Decimal('50.00')
            )

        self.account.refresh_from_db()
        self.assertEqual(self.account.balance, Decimal('0.00'))

    def test_balanced_double_entry_upon_registration(self):
        """Verify that user registration credits the user and debits system clearing equally."""
        clearing_before = self.system_clearing.balance
        reg_resp = self.client.post(
            reverse('auth_register'),
            {
                'email': 'newcustomer@datacore.io',
                'full_name': 'New Customer',
                'password': 'Password123!',
                'confirm_password': 'Password123!'
            }
        )
        self.assertEqual(reg_resp.status_code, status.HTTP_201_CREATED)

        new_user = User.objects.get(email='newcustomer@datacore.io')
        new_acc = Account.objects.get(user=new_user)
        self.assertEqual(new_acc.balance, Decimal('10000.00'))

        self.system_clearing.refresh_from_db()
        # System clearing must have been debited by 10000
        self.assertEqual(clearing_before - self.system_clearing.balance, Decimal('10000.00'))

        # Check ledger balance invariant: Total debits == Total credits
        total_debits = LedgerEntry.objects.filter(entry_type=LedgerEntry.EntryType.DEBIT).count()
        total_credits = LedgerEntry.objects.filter(entry_type=LedgerEntry.EntryType.CREDIT).count()
        self.assertEqual(total_debits, total_credits)
