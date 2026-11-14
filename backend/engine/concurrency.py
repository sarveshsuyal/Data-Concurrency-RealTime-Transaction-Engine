import time
from decimal import Decimal
from django.db import transaction, models
from .models import Account, TransactionEvent

class ConcurrencyException(Exception):
    """Base exception for concurrency engine failures."""
    pass

class InsufficientFundsException(ConcurrencyException):
    """Raised when an account lacks sufficient balance."""
    pass

class OptimisticLockConflictException(ConcurrencyException):
    """Raised when an optimistic lock version conflict occurs."""
    pass

class ConcurrencyStrategyHandler:
    """Implements different database concurrency strategies for transaction execution."""

    @staticmethod
    def execute_pessimistic(sender_id, receiver_id, amount, event_callback=None):
        """
        Pessimistic row-level locking using SELECT ... FOR UPDATE.
        Deadlock prevention: locks are acquired in canonical order by UUID.
        """
        # Canonical order prevents deadlock when two transactions lock the same pair in reverse
        first_id, second_id = (sender_id, receiver_id) if str(sender_id) < str(receiver_id) else (receiver_id, sender_id)

        if event_callback:
            event_callback('LOCK_ACQUIRING', {'first_id': str(first_id), 'second_id': str(second_id)})

        # Acquire pessimistic locks in canonical order
        first_acc = Account.objects.select_for_update().get(id=first_id)
        second_acc = Account.objects.select_for_update().get(id=second_id)

        sender = first_acc if first_acc.id == sender_id else second_acc
        receiver = second_acc if second_acc.id == receiver_id else first_acc

        if event_callback:
            event_callback('LOCK_ACQUIRED', {'sender_id': str(sender.id), 'receiver_id': str(receiver.id)})

        if sender.balance < amount:
            if event_callback:
                event_callback('INSUFFICIENT_FUNDS', {
                    'sender_balance': str(sender.balance),
                    'required_amount': str(amount)
                })
            raise InsufficientFundsException(
                f"Insufficient balance: Available {sender.balance}, requested {amount}"
            )

        sender.balance -= amount
        receiver.balance += amount
        sender.version += 1
        receiver.version += 1

        sender.save(update_fields=['balance', 'version', 'updated_at'])
        receiver.save(update_fields=['balance', 'version', 'updated_at'])

        if event_callback:
            event_callback('BALANCE_UPDATED', {
                'sender_new_balance': str(sender.balance),
                'receiver_new_balance': str(receiver.balance)
            })

        return sender, receiver

    @staticmethod
    def execute_optimistic(sender_id, receiver_id, amount, event_callback=None):
        """
        Optimistic locking using account version numbers.
        Detects conflicting concurrent writes and aborts safely.
        """
        # Read current state without row locks
        sender = Account.objects.get(id=sender_id)
        receiver = Account.objects.get(id=receiver_id)

        if event_callback:
            event_callback('OPTIMISTIC_READ', {
                'sender_version': sender.version,
                'receiver_version': receiver.version
            })

        if sender.balance < amount:
            if event_callback:
                event_callback('INSUFFICIENT_FUNDS', {
                    'sender_balance': str(sender.balance),
                    'required_amount': str(amount)
                })
            raise InsufficientFundsException(
                f"Insufficient balance: Available {sender.balance}, requested {amount}"
            )

        sender_initial_version = sender.version
        receiver_initial_version = receiver.version

        # Atomic conditional version update for sender
        sender_updated = Account.objects.filter(
            id=sender.id,
            version=sender_initial_version
        ).update(
            balance=sender.balance - amount,
            version=sender_initial_version + 1
        )

        if sender_updated == 0:
            if event_callback:
                event_callback('CONFLICT_DETECTED', {
                    'conflict_target': 'sender',
                    'expected_version': sender_initial_version
                })
            raise OptimisticLockConflictException(
                "Concurrent modification detected on sender account. Aborting."
            )

        # Atomic conditional version update for receiver
        receiver_updated = Account.objects.filter(
            id=receiver.id,
            version=receiver_initial_version
        ).update(
            balance=receiver.balance + amount,
            version=receiver_initial_version + 1
        )

        if receiver_updated == 0:
            if event_callback:
                event_callback('CONFLICT_DETECTED', {
                    'conflict_target': 'receiver',
                    'expected_version': receiver_initial_version
                })
            raise OptimisticLockConflictException(
                "Concurrent modification detected on receiver account. Aborting."
            )

        sender.refresh_from_db()
        receiver.refresh_from_db()

        if event_callback:
            event_callback('BALANCE_UPDATED', {
                'sender_new_balance': str(sender.balance),
                'receiver_new_balance': str(receiver.balance)
            })

        return sender, receiver

    @staticmethod
    def execute_atomic_conditional(sender_id, receiver_id, amount, event_callback=None):
        """
        Atomic conditional updates using database F() expressions and WHERE conditions.
        """
        if event_callback:
            event_callback('ATOMIC_CONDITIONAL_START', {
                'sender_id': str(sender_id),
                'amount': str(amount)
            })

        # Sender balance must be >= amount atomically
        rows_updated = Account.objects.filter(
            id=sender_id,
            balance__gte=amount
        ).update(
            balance=models.F('balance') - amount,
            version=models.F('version') + 1
        )

        if rows_updated == 0:
            if event_callback:
                event_callback('INSUFFICIENT_FUNDS', {'sender_id': str(sender_id), 'amount': str(amount)})
            raise InsufficientFundsException("Insufficient balance or sender account not found.")

        # Credit receiver
        Account.objects.filter(id=receiver_id).update(
            balance=models.F('balance') + amount,
            version=models.F('version') + 1
        )

        sender = Account.objects.get(id=sender_id)
        receiver = Account.objects.get(id=receiver_id)

        if event_callback:
            event_callback('BALANCE_UPDATED', {
                'sender_new_balance': str(sender.balance),
                'receiver_new_balance': str(receiver.balance)
            })

        return sender, receiver

    @staticmethod
    def execute_unsafe_baseline(sender_id, receiver_id, amount, event_callback=None):
        """
        Unsafe baseline execution for laboratory experiments only.
        Demonstrates check-then-act race conditions (lost updates / negative balances).
        """
        sender = Account.objects.get(id=sender_id)
        receiver = Account.objects.get(id=receiver_id)

        if event_callback:
            event_callback('UNSAFE_READ', {
                'sender_balance': str(sender.balance),
                'amount': str(amount)
            })

        # Artificial delay to widen race window in concurrent laboratory experiments
        # Allows all concurrent threads to read initial balance before any write commits
        time.sleep(0.08)

        if sender.balance < amount:
            # Under concurrency, multiple threads pass this check before any writes happen
            raise InsufficientFundsException("Unsafe check: insufficient funds")

        # Artificial delay between check and write
        time.sleep(0.08)

        # Unsafe check-then-act: applies the withdrawal without row lock or conditional guard
        Account.objects.filter(id=sender_id).update(balance=models.F('balance') - amount)
        Account.objects.filter(id=receiver_id).update(balance=models.F('balance') + amount)

        sender.refresh_from_db()
        receiver.refresh_from_db()

        if event_callback:
            event_callback('UNSAFE_WRITTEN', {
                'sender_new_balance': str(sender.balance),
                'receiver_new_balance': str(receiver.balance)
            })

        return sender, receiver
