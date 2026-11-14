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
                self.stdout.write(f"Admin already exists: {admin_user.email}")

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

                slug = cust["name"].split()[0].lower()
                acc, a_created = Account.objects.get_or_create(
                    user=user,
                    defaults={
                        "balance": cust["balance"],
                        "currency": "INR",
                        "version": 0,
                        "upi_id": f"{slug}@dc"
                    }
                )
                if a_created and cust["balance"] > Decimal("0.00"):
                    LedgerEntry.objects.create(
                        transaction=None,
                        account=acc,
                        entry_type=LedgerEntry.EntryType.CREDIT,
                        amount=cust["balance"],
                        balance_after=cust["balance"],
                        description="Initial seed deposit"
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
                initial_balance=1000.00,
                withdrawals=(700.00, 500.00)
            )
            self.stdout.write(self.style.SUCCESS("Demo experiment recorded in Lab!"))
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"Demo experiment note: {e}"))

        # 6. Seed Enterprise Domain Data (Organizations, Workspaces, SLOs, Anomaly Rules, Incidents, Webhooks, API Keys)
        try:
            from engine.models import (
                Organization, Workspace, WorkspaceMembership, ApiKey,
                WebhookEndpoint, Incident, AnomalyRule, ReliabilityObjective,
                BenchmarkRecord, Notification
            )
            import hashlib, secrets

            org, _ = Organization.objects.get_or_create(
                name="DataCore Global Financials",
                defaults={"slug": "datacore-global"}
            )
            ws_prod, _ = Workspace.objects.get_or_create(
                organization=org,
                name="Production High-Throughput",
                defaults={"slug": "prod-us-west", "environment": "Production"}
            )
            ws_stage, _ = Workspace.objects.get_or_create(
                organization=org,
                name="Staging Concurrency Sandbox",
                defaults={"slug": "staging-sandbox", "environment": "Staging"}
            )
            WorkspaceMembership.objects.get_or_create(
                workspace=ws_prod,
                user=admin_user,
                defaults={"role": WorkspaceMembership.Role.OWNER}
            )

            # SLOs
            ReliabilityObjective.objects.get_or_create(
                name="API Availability (30d)",
                defaults={"target_percentage": 99.9, "current_value": 99.98, "error_budget_consumed": 2.1}
            )
            ReliabilityObjective.objects.get_or_create(
                name="Transfer Latency P95 < 150ms",
                defaults={"target_percentage": 99.5, "current_value": 99.85, "error_budget_consumed": 14.2}
            )
            ReliabilityObjective.objects.get_or_create(
                name="Double-Entry Invariant Balance",
                defaults={"target_percentage": 100.0, "current_value": 100.0, "error_budget_consumed": 0.0}
            )

            # Anomaly Rules
            AnomalyRule.objects.get_or_create(
                name="High Value Fund Transfer Ceiling",
                defaults={
                    "rule_type": "HIGH_AMOUNT",
                    "threshold": Decimal("10000.00"),
                    "severity": "HIGH",
                    "is_active": True
                }
            )
            AnomalyRule.objects.get_or_create(
                name="Rapid Transaction Velocity Surge",
                defaults={
                    "rule_type": "RAPID_TRANSACTIONS",
                    "threshold": Decimal("5.00"),
                    "severity": "CRITICAL",
                    "is_active": True
                }
            )

            # Sample Incidents
            Incident.objects.get_or_create(
                title="Transient Lock Contention on Primary Account DC-6812",
                defaults={
                    "description": "Observed 12ms lock queue spike during concurrent batch settlement experiment. Resolved cleanly via canonical ordering.",
                    "severity": Incident.Severity.LOW,
                    "status": Incident.Status.RESOLVED,
                    "affected_service": "Database Engine"
                }
            )

            # Sample Webhook
            WebhookEndpoint.objects.get_or_create(
                user=admin_user,
                url="https://api.datacore-partner.com/webhooks/transactions",
                defaults={
                    "secret": f"whsec_{secrets.token_hex(24)}",
                    "events": ["transaction.completed", "transaction.failed", "anomaly.detected"],
                    "is_active": True
                }
            )

            # Sample API Key
            sample_secret = "dc_live_demo991823abce"
            ApiKey.objects.get_or_create(
                user=admin_user,
                name="Enterprise Settlement Service",
                defaults={
                    "prefix": "dc_live_demo",
                    "hashed_key": hashlib.sha256(sample_secret.encode('utf-8')).hexdigest(),
                    "scopes": ["read:transactions", "write:transfers", "read:observability"],
                    "is_active": True
                }
            )

            # Benchmark Records
            BenchmarkRecord.objects.get_or_create(
                workload_type="Pessimistic Row-Lock Workload",
                strategy="PESSIMISTIC",
                defaults={
                    "worker_count": 4,
                    "iterations": 50,
                    "tps": 248.5,
                    "avg_latency_ms": 7.4,
                    "p95_latency_ms": 11.2,
                    "p99_latency_ms": 15.8,
                    "conflict_rate": 0.0
                }
            )

            # Notification
            Notification.objects.get_or_create(
                user=admin_user,
                title="System Initialized Successfully",
                defaults={
                    "message": "DataCore Enterprise Infrastructure v2 is active with full double-entry ledger enforcement.",
                    "category": "SYSTEM"
                }
            )
            self.stdout.write(self.style.SUCCESS("Enterprise domain data seeded successfully!"))
        except Exception as ex:
            self.stdout.write(self.style.WARNING(f"Enterprise seed note: {ex}"))

        self.stdout.write(self.style.SUCCESS("DataCore seeding completed successfully!"))
