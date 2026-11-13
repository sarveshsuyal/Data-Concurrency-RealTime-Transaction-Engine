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
        time.sleep(0.04)

        if sender.balance < amount:
            # Under concurrency, multiple threads can pass this check before any writes happen!
            raise InsufficientFundsException("Unsafe check: insufficient funds")

        # Artificial delay between check and write
        time.sleep(0.04)

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

    @staticmethod
    def execute_deadlock_simulation(acc_a_id, acc_b_id, amount=Decimal('50.00')):
        """
        Demonstrates why naive reverse locking deadlocks and how DataCore prevents it.
        Worker 1: locks Account A, then attempts to lock Account B.
        Worker 2: locks Account B, then attempts to lock Account A.
        """
        import threading
        results = {
            'worker_1': {'status': 'PENDING', 'events': []},
            'worker_2': {'status': 'PENDING', 'events': []},
            'deadlock_detected': False,
            'resolution': 'DataCore canonical lock sorting (min/max UUID) resolves cyclic dependencies.'
        }
        barrier = threading.Barrier(2)

        def worker_1_task():
            try:
                results['worker_1']['events'].append('Worker 1: Acquiring lock on Account A')
                with transaction.atomic():
                    acc_a = Account.objects.select_for_update().get(id=acc_a_id)
                    results['worker_1']['events'].append('Worker 1: Acquired Account A')
                    barrier.wait(timeout=2.0)
                    time.sleep(0.05)
                    results['worker_1']['events'].append('Worker 1: Attempting reverse lock on Account B (contended)')
                    acc_b = Account.objects.select_for_update().get(id=acc_b_id)
                    results['worker_1']['status'] = 'COMPLETED'
            except Exception as e:
                results['worker_1']['status'] = 'ABORTED'
                results['worker_1']['events'].append(f'Worker 1 Conflict: {type(e).__name__}')
                results['deadlock_detected'] = True

        def worker_2_task():
            try:
                results['worker_2']['events'].append('Worker 2: Acquiring lock on Account B')
                with transaction.atomic():
                    acc_b = Account.objects.select_for_update().get(id=acc_b_id)
                    results['worker_2']['events'].append('Worker 2: Acquired Account B')
                    barrier.wait(timeout=2.0)
                    time.sleep(0.05)
                    results['worker_2']['events'].append('Worker 2: Attempting reverse lock on Account A (contended)')
                    acc_a = Account.objects.select_for_update().get(id=acc_a_id)
                    results['worker_2']['status'] = 'COMPLETED'
            except Exception as e:
                results['worker_2']['status'] = 'ABORTED'
                results['worker_2']['events'].append(f'Worker 2 Conflict: {type(e).__name__}')
                results['deadlock_detected'] = True

        t1 = threading.Thread(target=worker_1_task)
        t2 = threading.Thread(target=worker_2_task)
        t1.start()
        t2.start()
        t1.join(timeout=3.0)
        t2.join(timeout=3.0)

        return results


# =========================================================================
# Distributed Systems Failure Lab Simulators
# =========================================================================

class RetryStormSimulator:
    """Demonstrates request retries, exponential backoff, and full jitter."""
    @staticmethod
    def simulate_retries(strategy="EXPONENTIAL_JITTER", attempts=5, base_delay_ms=50):
        import random
        timeline = []
        current_delay = base_delay_ms

        for attempt in range(1, attempts + 1):
            if strategy == "IMMEDIATE":
                delay = 0
            elif strategy == "FIXED":
                delay = base_delay_ms
            elif strategy == "EXPONENTIAL":
                delay = base_delay_ms * (2 ** (attempt - 1))
            elif strategy == "EXPONENTIAL_JITTER":
                max_delay = base_delay_ms * (2 ** (attempt - 1))
                delay = random.uniform(base_delay_ms, max_delay)
            else:
                delay = base_delay_ms

            simulated_success = (attempt == attempts)
            timeline.append({
                'attempt': attempt,
                'delay_ms': round(delay, 2),
                'outcome': 'SUCCESS' if simulated_success else 'NETWORK_TIMEOUT',
                'strategy': strategy
            })

        total_duration = sum(item['delay_ms'] for item in timeline)
        return {
            'strategy': strategy,
            'total_attempts': attempts,
            'total_latency_ms': round(total_duration, 2),
            'timeline': timeline,
            'summary': f"Strategy {strategy} resolved after {attempts} attempts with total backoff {round(total_duration, 2)} ms."
        }


class CircuitBreakerSimulator:
    """Demonstrates Circuit Breaker state transitions: CLOSED -> OPEN -> HALF-OPEN -> CLOSED."""
    @staticmethod
    def simulate_circuit_breaker(failure_threshold=3, total_requests=8):
        states = []
        failure_count = 0
        state = "CLOSED"

        for req in range(1, total_requests + 1):
            if state == "CLOSED":
                if req <= failure_threshold:
                    failure_count += 1
                    outcome = "SERVICE_UNAVAILABLE"
                    if failure_count >= failure_threshold:
                        state = "OPEN"
                else:
                    outcome = "SUCCESS"
            elif state == "OPEN":
                outcome = "FAST_FAIL_SHORT_CIRCUIT"
                # Transition to HALF_OPEN after 2 fast-fails
                if req >= failure_threshold + 2:
                    state = "HALF_OPEN"
            elif state == "HALF_OPEN":
                outcome = "CANARY_SUCCESS"
                state = "CLOSED"
                failure_count = 0

            states.append({
                'request_index': req,
                'circuit_state': state,
                'outcome': outcome,
                'failures_tracked': failure_count
            })

        return {
            'failure_threshold': failure_threshold,
            'final_state': state,
            'history': states,
            'explanation': "Circuit breaker prevents cascade failures by tripping to OPEN upon reaching consecutive threshold failures."
        }

