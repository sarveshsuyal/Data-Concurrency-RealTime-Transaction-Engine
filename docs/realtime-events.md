# DataCore Real-Time Event Architecture

## 1. Overview
DataCore features an event-driven architecture that keeps the Flutter customer application and React admin dashboard continuously synchronized with the authoritative PostgreSQL database.

Financial mutations (peer transfers, admin balance adjustments, account status changes) publish real-time events that stream to authorized clients via Server-Sent Events (SSE) and resilient cursor-based polling.

```
       +-----------------------------------------------------------+
       |                  Financial Transaction                    |
       |               (transaction.atomic() Block)                |
       +-----------------------------+-----------------------------+
                                     |
           +-------------------------+-------------------------+
           |                                                   |
           v                                                   v
+----------------------+                             +----------------------+
|     Account &        |                             |   TransactionEvent   |
|  Ledger Entries      |                             |   (Outbox Record)    |
+----------------------+                             +----------------------+
                                                               |
                                                               v
                                             +---------------------------------+
                                             |     Event Delivery Engine       |
                                             +----------------+----------------+
                                                              |
                               +------------------------------+------------------------------+
                               |                                                             |
                               v                                                             v
                +------------------------------+                              +------------------------------+
                |    Server-Sent Events (SSE)   |                              |  Resilient Cursor-Based      |
                |  /api/events/stream/?token=  |                              |  Polling Fallback (/my/)     |
                +--------------+---------------+                              +--------------+---------------+
                               |                                                             |
                               v                                                             v
                +------------------------------+                              +------------------------------+
                |   Admin Dashboard Clients    |                              |   Flutter Mobile Clients     |
                |   (Live Tx Feed, Metrics)    |                              |   (Real-time Balance/Alerts) |
                +------------------------------+                              +------------------------------+
```

---

## 2. Event Types & Schemas

All events are modeled in the database table `engine_transactionevent`:

```json
{
  "id": "e4b6c310-9112-4eb9-a417-8e3b7b25ad18",
  "transaction_id": "98a129d2-78d1-419b-a010-8b1bce2b604b",
  "event_type": "TX_COMPLETED",
  "details": {
    "sender_account": "acc-uuid-1",
    "receiver_account": "acc-uuid-2",
    "amount": "150.00",
    "sender_new_balance": "850.00",
    "receiver_new_balance": "1150.00",
    "strategy": "PESSIMISTIC"
  },
  "created_at": "2026-11-14T17:15:30.123456Z"
}
```

### Standard Event Catalog:
- `TX_COMPLETED`: Emitted when a peer transfer completes and ledger entries are committed.
- `account.balance_changed`: Emitted to inform clients that an account balance has been updated.
- `adjustment.created`: Emitted when an administrator performs a manual credit or debit balance adjustment.
- `LEDGER_COMMITTED`: Emitted when double-entry ledger rows are written and balanced.
- `LOCK_ACQUIRED` / `LOCK_REJECTED`: Emitted during concurrency experiment runs to trace row-locking phases in the Race-Condition Laboratory.

---

## 3. Delivery Channels

### 3.1 Server-Sent Events (SSE)
- **Primary Endpoint:** `GET /api/events/stream/`
- **Authentication:** Supports standard `Authorization: Bearer <JWT>` header and URL query parameter `?token=<JWT>` (required for native browser `EventSource` which cannot pass custom HTTP headers).
- **Format:** Standard `text/event-stream` with `data: <json>\n\n`.
- **Filtering:** Regular users receive only events where their account is the sender or receiver; administrators receive platform-wide transaction events.

### 3.2 Cursor-Based User-Scoped Polling
- **Endpoint:** `GET /api/events/my/?since=<ISO_TIMESTAMP>`
- **Purpose:** Reliable fallback for mobile networks, battery-restricted background tabs, and environments where persistent HTTP streaming is interrupted.
- **Client Deduplication:** Both clients maintain an in-memory set of processed event UUIDs (`_processedEventIds`). Duplicate events received via reconnections or simultaneous channels are automatically discarded.

---

## 4. Mobile App Integration (`AccountProvider`)

In the Flutter customer application:
1. `AccountProvider` starts an event listener on initialization (`startEventSync()`).
2. When a `TX_COMPLETED` or `account.balance_changed` event arrives:
   - Sets `lastIncomingNotification = "Transaction updated: ₹<amount>"`.
   - Automatically invokes `fetchAccounts()` and `fetchTransactions()` to refresh balances without requiring manual user pull-to-refresh.
   - Cleans up timers and active listeners in `dispose()`.

---

## 5. Security & Isolation

1. **Authorization Guard:** Unauthenticated requests to `/api/events/stream/` or `/api/events/my/` receive HTTP 401 Unauthorized.
2. **Data Leak Prevention:** Event payloads sent to non-admin customers never include other users' sensitive account numbers, emails, or platform-wide balances.
3. **Outbox Isolation:** Event dispatch failures never cause financial ledger transactions to fail.
