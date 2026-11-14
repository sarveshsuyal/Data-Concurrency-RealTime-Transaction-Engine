from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from authentication.models import User
from engine.models import Account, LedgerEntry, AccountAdjustment, AuditLog
from engine.services import AdjustmentService

class AdminOperationsTests(TestCase):
    """
    Test suite verifying administrative controls: user search, filtering,
    pagination, manual credit/debit adjustments, lifecycle actions, and reconciliation.
    """

    def setUp(self):
        self.client = APIClient()
        self.system_clearing = Account.get_system_clearing_account()

        # Create Admin
        self.admin = User.objects.create_superuser(
            email="superadmin@datacore.io",
            full_name="Super Admin",
            password="AdminPassword123!"
        )

        # Create Normal Customer
        self.customer = User.objects.create_user(
            email="cust1@datacore.io",
            full_name="Customer One",
            password="Password123!"
        )
        self.customer_acc = Account.objects.create(
            user=self.customer,
            balance=Decimal('1000.00'),
            currency='INR',
            version=0,
            is_primary=True
        )
        # Balanced double-entry opening deposit
        LedgerEntry.objects.create(
            transaction=None,
            account=self.customer_acc,
            entry_type=LedgerEntry.EntryType.CREDIT,
            amount=Decimal('1000.00'),
            balance_after=Decimal('1000.00'),
            description="Initial deposit"
        )
        LedgerEntry.objects.create(
            transaction=None,
            account=self.system_clearing,
            entry_type=LedgerEntry.EntryType.DEBIT,
            amount=Decimal('1000.00'),
            balance_after=self.system_clearing.balance - Decimal('1000.00'),
            description="Initial liquidity"
        )
        self.system_clearing.balance -= Decimal('1000.00')
        self.system_clearing.save(update_fields=['balance', 'updated_at'])

        # Admin Auth Token
        login_resp = self.client.post(
            reverse('auth_login'),
            {'email': 'superadmin@datacore.io', 'password': 'AdminPassword123!'}
        )
        self.admin_token = login_resp.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.admin_token}')

    def test_admin_user_search_and_filter(self):
        """Verify server-side user search and filtering."""
        url = reverse('admin_users')

        # Search by email
        resp = self.client.get(url, {'search': 'cust1@datacore.io'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.data['results'] if 'results' in resp.data else resp.data
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['email'], 'cust1@datacore.io')

        # Filter by role
        resp_admin = self.client.get(url, {'role': 'ADMIN'})
        self.assertEqual(resp_admin.status_code, status.HTTP_200_OK)
        admin_results = resp_admin.data['results'] if 'results' in resp_admin.data else resp_admin.data
        for r in admin_results:
            self.assertEqual(r['role'], 'ADMIN')

    def test_admin_user_detail_view(self):
        """Verify detailed view with linked accounts and audit logs."""
        url = reverse('admin_user_detail', kwargs={'user_id': self.customer.id})
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['email'], self.customer.email)
        self.assertEqual(len(resp.data['accounts']), 1)
        self.assertEqual(resp.data['accounts'][0]['balance'], '1000.00')

    def test_manual_credit_adjustment(self):
        """Verify authorized admin can credit user balance with balanced double-entry ledger."""
        url = reverse('admin_account_adjustment', kwargs={'account_id': self.customer_acc.id})
        payload = {
            "operation": "credit",
            "amount": "250.00",
            "currency": "INR",
            "reason_code": "CUSTOMER_COMPENSATION",
            "admin_note": "Service delay refund case #9912"
        }
        resp = self.client.post(url, payload, HTTP_IDEMPOTENCY_KEY="adj-key-001", format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['new_balance'], '1250.00')

        self.customer_acc.refresh_from_db()
        self.assertEqual(self.customer_acc.balance, Decimal('1250.00'))

        # Check double-entry ledger
        entries = LedgerEntry.objects.filter(amount=Decimal('250.00'))
        self.assertEqual(entries.count(), 2)
        debit_entry = entries.filter(entry_type=LedgerEntry.EntryType.DEBIT).first()
        credit_entry = entries.filter(entry_type=LedgerEntry.EntryType.CREDIT).first()
        self.assertEqual(credit_entry.account, self.customer_acc)
        self.assertEqual(debit_entry.account, self.system_clearing)

        # Re-submitting with same idempotency key returns cached receipt without double credit
        resp_retry = self.client.post(url, payload, HTTP_IDEMPOTENCY_KEY="adj-key-001", format='json')
        self.assertEqual(resp_retry.status_code, status.HTTP_200_OK)
        self.customer_acc.refresh_from_db()
        self.assertEqual(self.customer_acc.balance, Decimal('1250.00'))

    def test_manual_debit_adjustment_and_insufficient_funds(self):
        """Verify debit adjustment reduces balance and prevents overdraft."""
        url = reverse('admin_account_adjustment', kwargs={'account_id': self.customer_acc.id})

        # Valid debit
        resp = self.client.post(url, {
            "operation": "debit",
            "amount": "300.00",
            "currency": "INR",
            "reason_code": "CHARGEBACK",
            "admin_note": "Chargeback reversal"
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['new_balance'], '700.00')

        # Excessive debit (insufficient balance)
        resp_excess = self.client.post(url, {
            "operation": "debit",
            "amount": "9999.00",
            "currency": "INR",
            "reason_code": "PENALTY",
            "admin_note": "Attempted over-debit"
        }, format='json')
        self.assertEqual(resp_excess.status_code, status.HTTP_400_BAD_REQUEST)
        self.customer_acc.refresh_from_db()
        self.assertEqual(self.customer_acc.balance, Decimal('700.00'))

    def test_user_suspend_and_reactivate_lifecycle(self):
        """Verify user suspension stops actions and preserves ledger records."""
        suspend_url = reverse('admin_user_suspend', kwargs={'user_id': self.customer.id})
        resp = self.client.post(suspend_url, {'reason': 'Fraud check'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.customer.refresh_from_db()
        self.assertFalse(self.customer.is_active)

        # Audit log written
        self.assertTrue(AuditLog.objects.filter(action="USER_SUSPENDED").exists())

        # Reactivate
        reactivate_url = reverse('admin_user_reactivate', kwargs={'user_id': self.customer.id})
        resp_re = self.client.post(reactivate_url, {'reason': 'Identity verified'})
        self.assertEqual(resp_re.status_code, status.HTTP_200_OK)
        self.customer.refresh_from_db()
        self.assertTrue(self.customer.is_active)

    def test_reconciliation_endpoint(self):
        """Verify reconciliation tool audits stored balance against ledger sum."""
        url = reverse('admin_reconciliation')
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('total_accounts_checked', resp.data)
        self.assertIn('discrepancies', resp.data)
        self.assertEqual(resp.data['discrepancies_count'], 0)
