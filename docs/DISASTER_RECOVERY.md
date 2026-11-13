# DataCore — Backup, Disaster Recovery & High Availability

---

## 1. Managed PostgreSQL Disaster Recovery Strategy

DataCore leverages cloud-managed PostgreSQL (Render Managed PostgreSQL) for high-availability database operations:

- **Automated Daily Backups:** Retained for 7 days with automated snapshots.
- **Point-in-Time Recovery (PITR):** Available on standard/pro database plans, permitting restoration to any second within the retention window.
- **Failover SLA:** Automatic node replacement with secondary replicas in high-availability multi-region setups.

---

## 2. Recovery Objectives

- **Recovery Point Objective (RPO):** < 5 minutes (via write-ahead log replication).
- **Recovery Time Objective (RTO):** < 15 minutes (via automated container redeployment and DB failover).

---

## 3. Data Integrity Verification Post-Restoration

Following a database restoration:
1. Run `GET /api/admin/consistency/` to verify:
   - Debit and credit ledger equality: $\sum \text{Debits} == \sum \text{Credits}$
   - Zero negative balances across all active customer accounts.
   - Idempotency key fingerprint integrity.
2. Review audit logs for uncommitted in-flight transfers.
