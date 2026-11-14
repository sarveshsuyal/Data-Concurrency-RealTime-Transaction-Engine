# DataCore System Architecture

## 1. Executive Summary & Four-Part Topology
**DataCore** is an enterprise-grade financial transaction and concurrency engine demonstrating database-level race condition prevention, double-entry ledger bookkeeping, duplicate transaction suppression via cryptographic idempotency keys, and real-time event dissemination.

The production system coordinates four primary components:

```
+------------------------------------+       +------------------------------------+
|    Flutter Customer Mobile App     |       |    React / TypeScript Dashboard    |
|   (Android APK / Native Flutter)   |       |        (Vercel Production)         |
+-----------------+------------------+       +-----------------+------------------+
                  |                                            |
                  | HTTPS + JWT Auth                           | HTTPS + JWT Auth
                  | (Idempotency-Key Header)                   | (Admin Permissions)
                  v                                            v
+---------------------------------------------------------------------------------+
|                      authoritative Django REST API Layer                         |
|                 (Render Web Service: datacore-backend-wktd)                     |
|                                                                                 |
|  * Authentication & Token Refresh        * Concurrency Engine (Pessimistic/Opt) |
|  * Double-Entry Balancing Service        * Idempotency SHA-256 Engine           |
|  * Admin Operations & Reconciliation     * SSE & Real-Time Event Dispatch       |
+----------------------------------------+----------------------------------------+
                                         |
                                         | Pooled PostgreSQL Connection (SSL)
                                         v
+---------------------------------------------------------------------------------+
|                         Authoritative Database Tier                             |
|                        (Supabase PostgreSQL Instance)                           |
|                                                                                 |
|  * engine_account (Row locks, Version)   * engine_ledgerentry (Immutable debit) |
|  * engine_transaction (Status, Latency)  * engine_idempotencykey (Fingerprint)  |
|  * engine_transactionevent (Outbox)      * engine_accountadjustment (Audit log) |
|  * SYS-CLEARING-001 (Zero-sum clearing)  * engine_auditlog (Admin tracing)      |
+---------------------------------------------------------------------------------+
```

### Architectural Guarantees:
1. **Zero Client Trust:** Neither the mobile client nor the browser dashboard directly mutates database records or balances. All state mutations flow through authenticated, validated Django endpoints.
2. **Credential Segregation:** Supabase service-role keys and database master credentials are never baked into Flutter APKs, Vite frontend bundles, or client-side storage. Only secure, short-lived JWTs are issued to authenticated users.
3. **Financial Invariant:** Account balances are authoritative projections of double-entry ledger entries. Total debits across all accounts strictly equal total credits.

---

## 2. Double-Entry Bookkeeping & Authoritative Clearing Account

### 2.1 The Double-Entry Invariant
Every financial event in DataCore is governed by:

$$\sum \text{Debits} = \sum \text{Credits}$$

For every peer-to-peer transfer of amount $X$ from Account $A$ to Account $B$:
- **Debit Leg:** Account $A$ balance decreases by $X$; an immutable `DEBIT` ledger row is appended.
- **Credit Leg:** Account $B$ balance increases by $X$; an immutable `CREDIT` ledger row is appended.
- Both ledger entries and account balance mutations are committed within the same database transaction.

### 2.2 System Clearing Account (`SYS-CLEARING-001`)
In traditional peer transfers, debits equal credits naturally. However, initial balance grants, deposits, and administrative balance adjustments previously created money out of thin air, violating ledger equality.

DataCore solves this by introducing the authoritative System Clearing Account (`SYS-CLEARING-001`):
- **User Registration Initial Deposit (e.g., ₹10,000 grant):**
  - Debit: `SYS-CLEARING-001` (clearing leg)
  - Credit: `User Primary Account` (customer leg)
  - Result: Conservation of money across the entire system.
- **Admin Credit Adjustment:**
  - Debit: `SYS-CLEARING-001`
  - Credit: `Target Account`
- **Admin Debit Adjustment:**
  - Debit: `Target Account`
  - Credit: `SYS-CLEARING-001`

---

## 3. Concurrency Control Strategies

### 3.1 Canonical Pessimistic Row Locking (`SELECT FOR UPDATE`)
- **Mechanism:** Acquires exclusive database-level row locks on involved accounts inside an atomic transaction (`transaction.atomic()`).
- **Deadlock Prevention:** Accounts are ordered by primary key UUID before locking:
  ```python
  first_id, second_id = min(sender_id, receiver_id), max(sender_id, receiver_id)
  first_account = Account.objects.select_for_update().get(id=first_id)
  second_account = Account.objects.select_for_update().get(id=second_id)
  ```
- **Guarantees:** Guarantees serialized execution without deadlocks. Completely eliminates race conditions under heavy concurrent load.

### 3.2 Optimistic Locking with Monotonic Version Counters
- **Mechanism:** Every `Account` row contains a monotonically increasing `version` integer.
- **Execution:**
  ```sql
  UPDATE engine_account
  SET balance = balance - :amount, version = version + 1
  WHERE id = :id AND version = :initial_version;
  ```
- **Guarantees:** If another thread altered the account between read and write, `rowcount == 0` is returned, raising `OptimisticLockConflictException` and triggering a clean rollback.

### 3.3 Atomic Conditional Updates
- **Mechanism:** Uses Django's `F()` expressions with filter guards:
  ```python
  rows_updated = Account.objects.filter(id=sender_id, balance__gte=amount).update(
      balance=models.F('balance') - amount,
      version=models.F('version') + 1
  )
  if rows_updated == 0:
      raise InsufficientFundsException()
  ```
- **Guarantees:** In-database atomic balance verification and deduction in a single atomic SQL statement without application-level race windows.

### 3.4 Unsafe Baseline (Lab Only)
- **Mechanism:** Intentionally introduces an artificial delay (`time.sleep(0.08)`) between balance checking and balance deduction.
- **Safety Boundary:** Strictly quarantined to temporary demo accounts generated within the Admin Dashboard Race-Condition Laboratory. Production accounts are blocked from selecting this strategy.

---

## 4. Idempotency & Duplicate Suppression

To prevent double debits from network retry storms, user double-taps, or replay attacks:
1. **Client Header:** Client sends `Idempotency-Key: <UUID-v4>`.
2. **Payload Fingerprinting:** The server computes `SHA-256(sender_id + receiver_id + amount + description)`.
3. **Atomic Key Reservation:** An `IdempotencyKey` record is reserved inside a database row lock.
4. **Resolution:**
   - **First Request:** Processed normally, response payload cached with status `COMPLETED`.
   - **Identical Retried Request:** Returns cached response with HTTP 200 OK without re-executing ledger operations.
   - **Mismatched Payload:** Using the same key with different payload returns HTTP 400 Bad Request.
   - **Concurrent Duplicate Submission:** In-flight concurrent submission returns HTTP 409 Conflict.

---

## 5. Real-Time Event Architecture

DataCore uses a transactional outbox pattern to guarantee event consistency:
1. **Outbox Commitment:** During every ledger transaction, a `TransactionEvent` record is inserted atomically within the same database transaction.
2. **Server-Sent Events (SSE):** Clients connect via `/api/events/stream/?token=<JWT>` or `/api/events/my/` to receive real-time streams of financial events (`TX_COMPLETED`, `account.balance_changed`, `adjustment.created`).
3. **Cursor-Based Polling Fallback:** Mobile and web clients support resilient HTTP polling every 4 seconds with event deduplication sets (`_processedEventIds`) for environments where SSE connections are dropped or restricted by mobile OS power managers.

---

## 6. Financial Integrity & Balance Permanence
DataCore guarantees balance permanence:
1. **No Ephemeral Overwrites:** Removed destructive seeder scripts from Render deploy pipelines. Existing user accounts and balances are never overwritten or reset to default amounts on redeployments.
2. **Deterministic Primary Account Querying:** Fixed `Account.Meta.ordering = ['created_at']` and added explicit `is_primary` flags, ensuring account queries never mistakenly fetch secondary or zero-balance test accounts.
3. **Strict Zero Representation:** Client models safely parse numeric or string `0.00` balances without evaluating them as falsy values or reverting to demo balances.
