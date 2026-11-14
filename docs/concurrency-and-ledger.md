# DataCore Concurrency Control and Double-Entry Ledger Specification

## 1. Concurrency Control Mechanisms

Financial transactions must remain mathematically sound and completely consistent under high-concurrency workloads. DataCore implements three production-grade concurrency strategies alongside an isolated laboratory baseline.

### 1.1 Canonical Pessimistic Row Locking (`SELECT ... FOR UPDATE`)
- **Use Case:** High-contention accounts where concurrent transfers are frequent.
- **Deadlock Prevention Algorithm:**
  When transferring between two accounts $A$ and $B$, acquiring locks in arbitrary order can result in deadlocks if another transaction transfers from $B$ to $A$ simultaneously. DataCore resolves this by enforcing a canonical lock acquisition order based on account UUID strings:
  ```python
  first_id, second_id = (sender_id, receiver_id) if str(sender_id) < str(receiver_id) else (receiver_id, sender_id)
  
  with transaction.atomic():
      first_acc = Account.objects.select_for_update().get(id=first_id)
      second_acc = Account.objects.select_for_update().get(id=second_id)
      # Execution proceeds with exclusive row locks held
  ```
- **Invariants Enforced:**
  - Balance cannot drop below zero (`balance >= amount`).
  - Concurrent operations are fully serialized by the database engine.

### 1.2 Optimistic Locking with Monotonic Version Counters
- **Use Case:** Low-to-medium contention systems where optimistic concurrency maximizes throughput.
- **Algorithm:**
  1. Read sender and receiver accounts without database row locks.
  2. Validate available balance against requested amount.
  3. Attempt an atomic conditional version increment:
     ```python
     sender_updated = Account.objects.filter(
         id=sender.id,
         version=sender_initial_version
     ).update(
         balance=models.F('balance') - amount,
         version=models.F('version') + 1
     )
     if sender_updated == 0:
         raise OptimisticLockConflictException("Concurrent modification detected")
     ```
  4. If another transaction modified the sender between step 1 and step 3, `sender_updated` returns 0, triggering an immediate rollback without corrupting state.

### 1.3 Atomic Conditional Updates
- **Use Case:** Ultra-fast balance debits without explicit row locking or application-level versions.
- **Algorithm:**
  Executes an in-database conditional update using database expressions:
  ```python
  rows_affected = Account.objects.filter(
      id=sender_id,
      balance__gte=amount
  ).update(
      balance=models.F('balance') - amount,
      version=models.F('version') + 1
  )
  if rows_affected == 0:
      raise InsufficientFundsException()
  ```

### 1.4 Unsafe Baseline (Lab Only)
- **Use Case:** Educational demonstration in the Race-Condition Laboratory.
- **Implementation:** Check-then-act pattern with artificial latency (`time.sleep(0.08)`) between balance read and balance write without row locks.
- **Demonstrated Flaw:** Multiple concurrent threads read the initial balance before any write commits, resulting in lost updates and negative balances. Strictly quarantined from production accounts.

---

## 2. Double-Entry Ledger Bookkeeping

In DataCore, an account balance is not an independent mutable number. It is an authoritative projection backed by an immutable sequence of double-entry ledger entries.

### 2.1 Ledger Invariant
For any financial transaction or balance modification across the entire platform:

$$\sum \text{Ledger Debits} = \sum \text{Ledger Credits}$$

### 2.2 System Clearing Account (`SYS-CLEARING-001`)
To ensure total ledger debits strictly equal total ledger credits even during non-peer operations (e.g., user registration bonuses, test deposits, and administrative adjustments), DataCore maintains a designated clearing account:
- **Account Number:** `SYS-CLEARING-001`
- **Initial Grant / Deposit:**
  - Debit: `SYS-CLEARING-001`
  - Credit: Customer Account
- **Admin Credit Adjustment:**
  - Debit: `SYS-CLEARING-001`
  - Credit: Target Account
- **Admin Debit Adjustment:**
  - Debit: Target Account
  - Credit: `SYS-CLEARING-001`

### 2.3 Mathematical Reconciliation Formula
The administrative reconciliation engine verifies database integrity using:

$$\text{Calculated Balance}_i = \sum_{j \in \text{Credits}_i} \text{Amount}_j - \sum_{k \in \text{Debits}_i} \text{Amount}_k$$

If $\text{Calculated Balance}_i \neq \text{Current Balance}_i$, an immediate discrepancy alert is raised with the exact difference and ledger references.

---

## 3. Cryptographic Idempotency & Duplicate Suppression

To prevent double-spending caused by network retries, browser reloads, or duplicate mobile taps:
1. **Client Header:** All mutating requests submit a client-generated UUID v4 in the `Idempotency-Key` header.
2. **Payload Fingerprint:** The backend hashes the canonical request payload:
   $$\text{Fingerprint} = \text{SHA-256}(\text{sender} + \text{receiver} + \text{amount} + \text{description})$$
3. **Database Guard:** The backend creates or locks an `IdempotencyKey` record:
   - If key does not exist: status is `PROCESSING`, transaction executes, and cached response is saved as `COMPLETED`.
   - If key exists and status is `COMPLETED`: cached response is returned immediately with HTTP 200 OK without re-executing ledger operations.
   - If key exists and status is `PROCESSING`: HTTP 409 Conflict is returned to indicate an in-flight duplicate submission.
   - If key exists but the payload fingerprint differs: HTTP 400 Bad Request is returned (`Idempotency key reuse with different parameters`).
