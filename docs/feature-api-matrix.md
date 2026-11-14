# DataCore Feature to API Matrix

Comprehensive mapping of all Customer Mobile App and Administrator Dashboard features to their backend APIs, database models, permissions, and validation status.

---

## 1. Authentication & Session Management

| UI Screen & Action | API Endpoint & Method | Request / Response Schema | Permission & Ownership | Models / Tables | Test Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Mobile/Admin Registration** | `POST /api/auth/register/` | In: `full_name`, `email`, `password`, `confirm_password`<br>Out: `user`, `access`, `refresh` | Public | `authentication.User`, `engine.Account`, `engine.LedgerEntry` | Passing |
| **Mobile/Admin Login** | `POST /api/auth/login/` | In: `email`, `password`<br>Out: `user`, `access`, `refresh` | Public | `authentication.User`, `engine.AuditLog` | Passing |
| **Token Refresh** | `POST /api/auth/refresh/` | In: `refresh`<br>Out: `access` | Public | SimpleJWT Token Store | Passing |
| **Session Heartbeat** | `POST /api/auth/heartbeat/` | In: `{}`<br>Out: `status`, `last_heartbeat` | Authenticated User | `authentication.User` | Passing |
| **User Profile** | `GET /api/auth/profile/` | In: None<br>Out: `id`, `email`, `full_name`, `role`, `date_joined`, `last_heartbeat` | Authenticated User | `authentication.User` | Passing |
| **Logout & Token Revocation** | `POST /api/auth/logout/` | In: `refresh`<br>Out: `message` | Authenticated User | `engine.AuditLog`, SimpleJWT Blacklist | Passing |

---

## 2. Customer Ledger & Fund Transfers

| UI Screen & Action | API Endpoint & Method | Request / Response Schema | Permission & Ownership | Models / Tables | Test Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Home Screen - Fetch Balances** | `GET /api/accounts/` | In: None<br>Out: List of accounts (`id`, `account_number`, `balance`, `currency`, `version`) | Authenticated Owner | `engine.Account` | Passing |
| **Transfer Screen - Execute Transfer** | `POST /api/transactions/`<br>Header: `Idempotency-Key` | In: `receiver_identifier`, `amount`, `description`, `concurrency_strategy`<br>Out: Transaction receipt with balance after | Authenticated Sender | `engine.Account`, `engine.Transaction`, `engine.LedgerEntry`, `engine.IdempotencyKey`, `engine.TransactionEvent` | Passing |
| **History Screen - List Transactions** | `GET /api/transactions/history/` | In: Optional filters (`page`, `direction`)<br>Out: Paginated transactions | Authenticated Account Participant | `engine.Transaction` | Passing |
| **Transaction Detail Modal** | `GET /api/transactions/<uuid:pk>/` | In: None<br>Out: Transaction detail + ledger legs | Authenticated Account Participant | `engine.Transaction`, `engine.LedgerEntry` | Passing |
| **Real-Time Transfer Notification** | `GET /api/events/stream/` | In: Query `token` or Bearer header<br>Out: SSE stream of incoming payments & balance changes | Authenticated User (scoped events) | `engine.TransactionEvent` | Passing |
| **Polling Missed Event Recovery** | `GET /api/events/my/` | In: Optional `since` timestamp<br>Out: List of missed events | Authenticated User | `engine.TransactionEvent` | Passing |

---

## 3. Administrator Console & Financial Controls

| UI Screen & Action | API Endpoint & Method | Request / Response Schema | Permission & Ownership | Models / Tables | Test Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Overview Dashboard** | `GET /api/admin/overview/` | In: None<br>Out: Platform metrics, throughput, latency, ledger balance check | Admin Role Only | All models | Passing |
| **User Search, Filters & Pagination** | `GET /api/admin/users/` | In: `search`, `role`, `is_active`, `min_balance`, `max_balance`, `page`<br>Out: Paginated users with accounts & tx counts | Admin Role Only | `authentication.User`, `engine.Account`, `engine.Transaction` | Passing |
| **User Detail Drawer** | `GET /api/admin/users/<uuid:user_id>/` | In: None<br>Out: Detailed user profile, linked accounts, tx history, audit logs | Admin Role Only | `authentication.User`, `engine.Account`, `engine.Transaction`, `engine.AuditLog` | Passing |
| **Manual Credit/Debit Adjustment** | `POST /api/admin/accounts/<uuid:account_id>/adjustments/`<br>Header: `Idempotency-Key` | In: `operation`, `amount`, `currency`, `reason_code`, `admin_note`<br>Out: Adjustment receipt with updated balance | Admin Role Only | `engine.Account`, `engine.LedgerEntry`, `engine.AuditLog`, `engine.IdempotencyKey` | Passing |
| **User Suspend / Reactivate** | `POST /api/admin/users/<uuid:user_id>/suspend/`<br>`POST /api/admin/users/<uuid:user_id>/reactivate/` | In: `reason`<br>Out: User status & audit record | Admin Role Only | `authentication.User`, `engine.AuditLog` | Passing |
| **Safe Deactivate (Soft Delete)** | `POST /api/admin/users/<uuid:user_id>/deactivate/` | In: `reason`, `confirm: true`<br>Out: Deactivation receipt | Admin Role Only | `authentication.User`, `engine.AuditLog` | Passing |
| **Live Concurrency Monitor** | `GET /api/admin/concurrency/` | In: None<br>Out: Recent lock acquisition & version conflict events | Admin Role Only | `engine.TransactionEvent` | Passing |
| **Race-Condition Laboratory** | `POST /api/admin/experiments/` | In: `strategy`, `initial_balance`, `withdrawals`<br>Out: Multi-thread simulation trace with invariants check | Admin Role Only | `engine.ConcurrencyExperiment`, `engine.Account` | Passing |
| **Duplicate Request Inspector** | `GET /api/admin/duplicates/` | In: None<br>Out: Registered idempotency keys, payloads, hashes & statuses | Admin Role Only | `engine.IdempotencyKey` | Passing |
| **Double-Entry Ledger Audit** | `GET /api/admin/reconciliation/` | In: None<br>Out: Stored vs ledger-calculated balance verification across all accounts | Admin Role Only | `engine.Account`, `engine.LedgerEntry` | Passing |
| **Security Audit Trail** | `GET /api/admin/audit-logs/` | In: Optional filter `action`<br>Out: Paginated audit log records | Admin Role Only | `engine.AuditLog` | Passing |
