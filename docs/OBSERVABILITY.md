# DataCore — Observability, Metrics & Telemetry Specification

---

## 1. Observability Pillars

DataCore provides three levels of real-time operational observability:

```text
                               DATACORE OBSERVABILITY
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        ▼                                ▼                                ▼
     METRICS                          LOGS                             TRACES
  - Transactions / Sec            - Structured JSON                - Correlation IDs
  - P50, P95, P99 Latency         - Audit Event Trail              - Stage Latency Breakdown
  - Lock Wait Milliseconds        - Tamper-Evident Hash Chain      - Request-to-Ledger Flow
  - Connection Utilization        - Security Incidents             - Error Classification
```

---

## 2. Real-Time Telemetry Endpoints

- `GET /api/admin/overview/`: Platform aggregate stats (throughput, latency, active users, ledger balance equality).
- `GET /api/admin/metrics/`: Concurrency strategy breakdowns, transaction status counts, average execution times.
- `GET /api/admin/concurrency/`: Real-time stream of locking and version conflict events.
- `GET /api/admin/consistency/`: Multi-table consistency verification and ledger balance audit.
- `GET /api/events/stream/`: Server-Sent Events (SSE) pipe streaming live transaction events directly to connected clients.
- `GET /api/admin/observatory/`: PostgreSQL connection pool status, active/idle count, lock contention inspection, slow query plans.

---

## 3. Correlation Tracing

Every transaction request carries a unique UUID correlation identifier (`correlation_id`). This ID is propagated across:
1. HTTP Response Header: `X-Correlation-ID: <UUID>`
2. Event Logs: `TransactionEvent.details.correlation_id`
3. Audit Trail: `AuditLog.details.correlation_id`
4. Webhook Payloads: `payload.correlation_id`
