# DataCore — Architecture Decision Records (ADRs)

---

## ADR-001: Double-Entry Ledger Bookkeeping for Balance Conservation

### Status
Accepted & Enforced

### Context
In financial systems, storing balances merely as mutable columns on an account table (`UPDATE account SET balance = balance - 100`) creates data loss risks and obscures financial audits. If a calculation fails or a concurrent update races, money can vanish or appear without trace.

### Decision
Every fund movement must be accompanied by two atomic, immutable ledger entries:
1. A **DEBIT** entry reducing the sender's account.
2. A **CREDIT** entry augmenting the receiver's account.

Invariant:
$$\sum \text{Debits} = \sum \text{Credits}$$

The account's current balance can be audited at any time by reconstructing the ledger history.

### Consequences
- Requires additional writes per transaction (2 ledger entries per transfer).
- Guarantees complete auditability and mathematical balance conservation.

---

## ADR-002: Canonical Pessimistic Row Locking (`SELECT FOR UPDATE`)

### Status
Accepted & Enforced

### Context
When two users concurrently transfer funds to each other (Alice -> Bob and Bob -> Alice), naive locking locks Alice's row in thread 1 and Bob's row in thread 2. When thread 1 attempts to lock Bob and thread 2 attempts to lock Alice, a database deadlock occurs.

### Decision
Sort account IDs in canonical order (by UUID string representation) before issuing `SELECT FOR UPDATE`:
```python
first_id, second_id = (sender_id, receiver_id) if str(sender_id) < str(receiver_id) else (receiver_id, sender_id)
first_acc = Account.objects.select_for_update().get(id=first_id)
second_acc = Account.objects.select_for_update().get(id=second_id)
```

### Consequences
- Eliminates cyclic wait graphs and deadlocks on two-party transfers.
- Ensures deterministic serializability across competing requests.

---

## ADR-003: SHA-256 Payload Fingerprinting for Idempotency

### Status
Accepted & Enforced

### Context
Mobile apps and web clients operating over unreliable wireless networks often retry timed-out requests. If a transfer succeeded on the server but the connection dropped before the response was received, a blind retry would double-charge the sender.

### Decision
Require an `Idempotency-Key` HTTP header. Store the SHA-256 digest of the request payload (`sender`, `receiver`, `amount`, `description`).
- If an in-flight request with the same key arrives, return `409 Conflict`.
- If a completed request with the same key and payload arrives, return the cached `200 OK` response with original transaction ID.
- If the key is reused with different parameters, reject with `400 Bad Request`.

### Consequences
- Prevents double-spending and duplicate submissions.
- Safe for network retries.

---

## ADR-004: Multi-Tenant Workspace Model

### Status
Accepted & Enforced

### Context
Enterprise deployments require organizational boundaries where teams operate in isolated workspaces while platform administrators retain global observability.

### Decision
Introduce `Organization` and `Workspace` domain entities. Every financial account and transaction is scoped to a workspace. Queries from non-admin users automatically filter by the active workspace ID.

### Consequences
- Strong data isolation.
- Supports multi-tenant enterprise administration.

---

## ADR-005: Premium Visual Identity & Design System Tokens

### Status
Accepted & Enforced

### Context
The user interface must convey the visual sophistication of a modern, high-tier fintech infrastructure product, avoiding generic dark dashboard styling.

### Decision
Adopt the approved Master Brand palette:
- Soft Pink: `#F8C4DB`
- Rose: `#F4A8CB`
- Lavender: `#DCC5FA`
- Purple: `#BFA1F5`
- Peach: `#FFE1CE`
- Warm White: `#FFFDFE`
- Soft Gray: `#F5F2F7`
- Deep Text: `#30283C`

Implement persistent Light, Dark, and System theme modes, Framer Motion page and component transitions, glassmorphic card containers, and a Command Palette (Ctrl+K).
