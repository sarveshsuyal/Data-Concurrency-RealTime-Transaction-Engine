import sys
from decimal import Decimal
from django.db import migrations
from django.contrib.auth.hashers import make_password


def seed_datacore_users(apps, schema_editor):
    if 'test' in sys.argv:
        return
    User = apps.get_model('authentication', 'User')
    Account = apps.get_model('engine', 'Account')
    LedgerEntry = apps.get_model('engine', 'LedgerEntry')

    # 1. Create or update System Administrator
    admin_user, _ = User.objects.get_or_create(
        email='admin@datacore.io',
        defaults={
            'full_name': 'System Administrator',
            'role': 'ADMIN',
            'is_staff': True,
            'is_superuser': True,
        }
    )
    admin_user.password = make_password('AdminPassword123!')
    admin_user.role = 'ADMIN'
    admin_user.is_staff = True
    admin_user.is_superuser = True
    admin_user.save()

    # 2. System Clearing Account
    system_user, _ = User.objects.get_or_create(
        email='system-clearing@datacore.internal',
        defaults={
            'full_name': 'DataCore System Clearing',
            'role': 'ADMIN',
            'is_staff': True,
            'is_active': True,
        }
    )
    system_clearing, _ = Account.objects.get_or_create(
        account_number='SYS-CLEARING-001',
        defaults={
            'user': system_user,
            'balance': Decimal('0.00'),
            'currency': 'INR',
            'is_active': True,
            'is_primary': False,
        }
    )

    # 3. Create or update Demo Customers
    demo_customers = [
        {'email': 'alice@datacore.io', 'name': 'Alice Johnson', 'balance': Decimal('10000.00'), 'acc': 'DC-ALICE-001'},
        {'email': 'bob@datacore.io', 'name': 'Bob Smith', 'balance': Decimal('7500.00'), 'acc': 'DC-BOB-001'},
        {'email': 'charlie@datacore.io', 'name': 'Charlie Davis', 'balance': Decimal('5000.00'), 'acc': 'DC-CHARLIE-001'},
    ]

    for cust in demo_customers:
        user, u_created = User.objects.get_or_create(
            email=cust['email'],
            defaults={
                'full_name': cust['name'],
                'role': 'USER',
                'is_active': True,
            }
        )
        if u_created:
            user.password = make_password('Password123!')
            user.save()

        acc, a_created = Account.objects.get_or_create(
            user=user,
            defaults={
                'account_number': cust['acc'],
                'balance': cust['balance'],
                'currency': 'INR',
                'is_primary': True,
                'is_active': True,
            }
        )
        if a_created:
            # Create balanced double-entry opening ledger entry
            LedgerEntry.objects.create(
                account=system_clearing,
                entry_type='DEBIT',
                amount=cust['balance'],
                balance_after=system_clearing.balance,
                description=f"Initial provisioning for {user.email}",
            )
            LedgerEntry.objects.create(
                account=acc,
                entry_type='CREDIT',
                amount=cust['balance'],
                balance_after=acc.balance,
                description="Opening test balance",
            )


def reverse_func(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0001_initial'),
        ('engine', '0002_alter_account_options_account_is_primary_and_more'),
    ]

    operations = [
        migrations.RunPython(seed_datacore_users, reverse_func),
    ]
