# DataCore — Reliability Engineering, SLOs & Error Budgets

---

## 1. Service Level Objectives (SLOs)

DataCore enforces clear internal reliability targets:

| Objective Name | Target SLA/SLO | Measurement Window | Measurement Method |
| :--- | :--- | :--- | :--- |
| **API Availability** | **99.9%** | Rolling 30 Days | Successful HTTP status codes (2xx, 3xx, 4xx) vs 5xx errors |
| **Transfer Processing Latency** | **P95 < 150 ms** | Rolling 24 Hours | Execution duration recorded in `Transaction.latency_ms` |
| **Ledger Invariant Consistency** | **100.0%** | Continuous | Invariant: $\sum \text{Debits} == \sum \text{Credits}$; Zero negative balances |
| **Idempotency Durability** | **100.0%** | Continuous | Zero duplicate transactions under identical key submissions |

---

## 2. Error Budget Management

- **Monthly Allowed Downtime (99.9%):** ~43.8 minutes per month.
- **Burn Rate Alerts:**
  - **1x Burn Rate:** Normal operation.
  - **2x Burn Rate:** Warning notification sent to operations dashboard.
  - **14.4x Burn Rate (2% consumed in 1 hour):** High-severity incident automatically created in Incident Center.
