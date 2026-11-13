# DataCore — Technical Debt Analysis & Remediation Log

This document identifies architectural bottlenecks, legacy patterns, security gaps, and operational limitations in the existing codebase along with planned and implemented remediations.

---

## 1. Technical Debt Inventory

| Category | Issue Description | Impact | Severity | Remediation Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **Concurrency** | SQLite lock contention in local development | SQLite serializes writers; high concurrency tests can hit table-level lock timeouts. | Medium | Use `TIMEOUT=20` and WAL mode for SQLite local runs; document PostgreSQL as authoritative for production. |
| **Ledger** | Absence of compensating reversal transaction type | Erroneous transfers currently require manual intervention rather than an automated immutable audit reversal. | High | Introduce `REVERSED` transaction status and compensating credit/debit ledger entries. |
| **Observability** | No native lock wait telemetry | Admin UI could only see events triggered by app code, not internal PostgreSQL locks. | Medium | Add Database Observatory endpoints querying `pg_stat_activity` and `pg_locks` safely. |
| **Tenancy** | Single flat tenant model | Multiple enterprise organizations sharing the same database lacked workspace data segregation. | High | Introduce `Organization` and `Workspace` foreign keys with query filtering and permission enforcement. |
| **Security** | Static API authentication | External systems could only integrate via user JWT tokens, which expire frequently. | High | Introduce hashed API Keys (`DC-live-...`) with granular permission scopes (`read:transactions`, `write:transfers`). |
| **Integration** | Missing Webhook event delivery | Downstream platforms were forced to poll for transfer updates. | Medium | Build Webhook subscription engine with HMAC-SHA256 signature headers (`X-DataCore-Signature`). |
| **Frontend UI** | Rigid dark theme with limited branding | UI lacked the Master Brand aesthetic, theme switching, and keyboard navigation. | Medium | Rebuild frontend shell with theme switcher (Light / Dark / System), Master palette tokens, Framer Motion, and Ctrl+K. |
| **Reliability** | No formal SLO monitoring | Operations could not observe availability burn rates or latency budget depletion. | Medium | Add SLO and Reliability Center with configurable availability targets and error budget gauges. |

---

## 2. Invariant Protection Rules

To prevent regressions while addressing technical debt:

1. **Balance Immutability:** Never overwrite historical ledger balances. Balance adjustments must only occur through paired debit/credit transactions.
2. **Deterministic Locking:** Rows must always be acquired in canonical order (`min(s, r)` then `max(s, r)`) to avoid database deadlocks.
3. **Idempotency Durability:** Once an idempotency key transitions to `COMPLETED`, its response payload is permanently cached and immutable.
4. **Tenant Isolation:** Cross-tenant queries must always fail closed at the DRF queryset layer.
