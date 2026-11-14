from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import transaction
from authentication.models import User
from engine.models import Account, LedgerEntry, Transaction, AuditLog
from engine.services import TransferService, RaceExperimentService

class Command(BaseCommand):
    help = "Seed database with superuser, demo customer accounts, balances, and initial sample transactions."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Initializing DataCore Seed Data..."))

        with transaction.atomic():
            # 1. Create Superuser / Administrator
            admin_user, created = User.objects.get_or_create(
                email="admin@datacore.io",
                defaults={
                    "full_name": "System Administrator",
                    "role": User.Role.ADMIN,
                    "is_staff": True,
                    "is_superuser": True,
                }
            )
            if created:
                admin_user.set_password("AdminPassword123!")
                admin_user.save()
                self.stdout.write(self.style.SUCCESS(f"Created Admin: admin@datacore.io / AdminPassword123!"))
            else:
                admin_user.set_password("AdminPassword123!")
                admin_user.role = User.Role.ADMIN
                admin_user.is_staff = True
                admin_user.is_superuser = True
                admin_user.save()
                self.stdout.write(f"Verified Admin credentials: {admin_user.email} / AdminPassword123!")

            system_clearing = Account.get_system_clearing_account()

            # 2. Create Demo Customers
            demo_customers = [
                {"email": "alice@datacore.io", "name": "Alice Johnson", "balance": Decimal("10000.00")},
                {"email": "bob@datacore.io", "name": "Bob Smith", "balance": Decimal("7500.00")},
                {"email": "charlie@datacore.io", "name": "Charlie Davis", "balance": Decimal("5000.00")},
            ]

            accounts = {}
            for cust in demo_customers:
                user, u_created = User.objects.get_or_create(
                    email=cust["email"],
                    defaults={
                        "full_name": cust["name"],
                        "role": User.Role.USER
                    }
                )
                if u_created:
                    user.set_password("Password123!")
                    user.save()

                acc, a_created = Account.objects.get_or_create(
                    user=user,
                    defaults={
                        "balance": cust["balance"],
                        "currency": "INR",
                        "version": 0,
                        "is_primary": True
                    }
                )
                if a_created and cust["balance"] > Decimal("0.00"):
                    system_clearing.balance -= cust["balance"]
                    system_clearing.save(update_fields=['balance', 'updated_at'])

                    LedgerEntry.objects.create(
                        transaction=None,
                        account=acc,
                        entry_type=LedgerEntry.EntryType.CREDIT,
                        amount=cust["balance"],
                        balance_after=cust["balance"],
                        description="Initial seed deposit"
                    )
                    LedgerEntry.objects.create(
                        transaction=None,
                        account=system_clearing,
                        entry_type=LedgerEntry.EntryType.DEBIT,
                        amount=cust["balance"],
                        balance_after=system_clearing.balance,
                        description=f"System seed liquidity allocation for {user.email}"
                    )
                accounts[cust["email"]] = acc
                self.stdout.write(self.style.SUCCESS(f"Customer ready: {user.email} (Acc: {acc.account_number})"))

            # 3. Create Sample Audit Log
            AuditLog.objects.create(
                user=admin_user,
                action="SYSTEM_INITIALIZED",
                ip_address="127.0.0.1",
                user_agent="DataCore CLI Seeder",
                details={"status": "initial_seed_completed"}
            )

        # 4. Execute a couple of realistic demo transfers with double-entry ledger & events
        try:
            self.stdout.write("Executing sample transaction (Alice -> Bob: ₹500)...")
            TransferService.execute_transfer(
                user=accounts["alice@datacore.io"].user,
                sender_account_id=accounts["alice@datacore.io"].id,
                receiver_account_id=accounts["bob@datacore.io"].id,
                amount=Decimal("500.00"),
                description="Dinner reimbursement",
                idempotency_key_value="demo-tx-key-001",
                strategy=Transaction.ConcurrencyStrategy.PESSIMISTIC
            )
            self.stdout.write(self.style.SUCCESS("Sample transaction completed!"))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"Demo transfer note: {e}"))

        # 5. Run an initial sample Race Condition Laboratory experiment
        try:
            self.stdout.write("Running initial demonstration Race Condition Experiment in Lab...")
            RaceExperimentService.run_experiment(
                admin_user=admin_user,
                strategy=Transaction.ConcurrencyStrategy.PESSIMISTIC,
                initial_balance=1000.0,
                withdrawals=(700.0, 500.0)
            )
            self.stdout.write(self.style.SUCCESS("Demo experiment recorded in Lab!"))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"Demo experiment note: {e}"))

        self.stdout.write(self.style.SUCCESS("DataCore seeding completed successfully!"))
