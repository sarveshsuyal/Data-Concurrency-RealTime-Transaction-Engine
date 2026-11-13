# DataCore — Automated Testing & Quality Assurance Guide

---

## 1. Test Suite Architecture

The test suite covers:
1. **Authentication & RBAC:** Registration, login, token refresh, role authorization, and permission enforcement.
2. **Transaction Processing:** Atomic transfers, debit/credit ledger equality, insufficient balance rollbacks.
3. **Concurrency Engineering:** Multi-threaded race conditions, row locking serialization, optimistic conflict detection, and unsafe baseline overdrafts.
4. **Idempotency Protection:** Replay detection, payload tampering rejection, and in-flight collision checks.
5. **Multi-Tenancy & Security:** Workspace boundary isolation and API key validation.

---

## 2. Test Execution Commands

```bash
# Run all backend tests
cd backend
python manage.py test tests/

# Run specific test modules
python manage.py test tests.test_auth
python manage.py test tests.test_transactions
python manage.py test tests.test_concurrency

# Run with verbose output
python manage.py test tests/ -v 2
```

---

## 3. Financial Invariant Verification Tests

| Test Case | Method | Expected Invariant |
| :--- | :--- | :--- |
| `test_successful_transfer_and_ledger_double_entry` | `TransactionAndLedgerTests` | $\sum \text{Debits} = \sum \text{Credits}$; sender balance decremented, receiver incremented; ledger entries = 2. |
| `test_insufficient_funds_rollback` | `TransactionAndLedgerTests` | Complete rollback; zero ledger entries; balances unchanged. |
| `test_idempotency_key_duplicate_prevention` | `TransactionAndLedgerTests` | Repeated POST returns cached HTTP 200 without executing a second transfer. |
| `test_idempotency_key_reuse_different_payload_rejected` | `TransactionAndLedgerTests` | Returns HTTP 400 when payload hash mismatches existing key. |
| `test_pessimistic_locking_race_experiment` | `ConcurrencyEngineTests` | High-contention concurrent withdrawals: exactly 1 succeeds, 1 fails; balance never negative. |
| `test_optimistic_locking_detects_version_conflict` | `ConcurrencyEngineTests` | Conflicting version updates return rowcount 0 and abort cleanly. |
| `test_unsafe_baseline_demonstrates_race_condition` | `ConcurrencyEngineTests` | Unprotected check-then-act demonstrates invariant violation (negative balance). |
