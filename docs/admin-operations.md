# DataCore Admin Operations Guide

## 1. Overview
The DataCore Admin Dashboard (`https://transactionenngine.vercel.app`) provides comprehensive administrative controls, real-time observability, ledger reconciliation, and user lifecycle management backed by authoritative Django REST API endpoints (`https://datacore-backend-wktd.onrender.com`).

All administrative actions require:
- An authenticated user with `role = 'ADMIN'`.
- Valid JWT Bearer token in the `Authorization` header.
- Exclusive backend enforcement (client UI restrictions are strictly cosmetic; endpoints reject non-admin tokens with `403 Forbidden`).

---

## 2. User Management & Discovery

The Admin Users interface (`/users`) allows platform administrators to search, filter, inspect, and manage all registered customer accounts.

### 2.1 Search, Filtering & Pagination
- **Search:** Query parameter `?search=<text>` searches case-insensitively across `email`, `first_name`, and `last_name`.
- **Role Filter:** Query parameter `?role=ADMIN` or `?role=USER`.
- **Status Filter:** Query parameter `?is_active=true` or `?is_active=false`.
- **Balance Range Filter:** Query parameters `?min_balance=<decimal>` and `?max_balance=<decimal>` filter users whose primary account balance falls within the specified bounds.
- **Pagination:** Standard pagination with `?page=<number>&page_size=15` returning:
  ```json
  {
    "count": 42,
    "next": "https://datacore-backend-wktd.onrender.com/api/admin/users/?page=2",
    "previous": null,
    "results": [ ... ]
  }
  ```
- **CSV Export:** Appending `?format=csv` downloads a real-time CSV snapshot containing user IDs, emails, roles, active status, account numbers, and current balances.

### 2.2 User Detail Drawer
Clicking **Inspect** on any user row opens the sliding User Detail Drawer displaying:
1. **User Identity & Roles:** User UUID, email, full name, role badge, joined timestamp.
2. **Accounts Tab:** All linked accounts, account numbers, active status, and live balances.
3. **Recent Transactions Tab:** Complete history of transfers initiated or received by the user with amounts, status badges, timestamps, and latency figures.
4. **Adjustment History Tab:** Complete audit history of manual credit/debit adjustments performed on the user's accounts.
5. **Audit Activity Tab:** System security logs showing suspension, reactivation, and profile modifications.

---

## 3. Account Balance Adjustments

Administrators can issue controlled balance adjustments (credits or debits) to correct discrepancies, issue test disbursements, or perform clawbacks.

### 3.1 Adjustment Endpoint
- **URL:** `POST /api/admin/accounts/<uuid:account_id>/adjustments/`
- **Request Headers:**
  - `Authorization: Bearer <ADMIN_JWT>`
  - `Idempotency-Key: <UUID-v4>`
- **Request Body:**
  ```json
  {
    "adjustment_type": "CREDIT",
    "amount": "250.00",
    "reason_code": "CUSTOMER_SUPPORT_REFUND",
    "note": "Refund for disputed test charge",
    "idempotency_key": "c3b99a61-1254-4a57-897e-d4cbf239f28a"
  }
  ```

### 3.2 Integrity & Financial Conservation Rules
1. **Double-Entry Enforcement:** Every adjustment is balanced against the authoritative `SYS-CLEARING-001` account.
   - **CREDIT:** Debits `SYS-CLEARING-001`, credits target account.
   - **DEBIT:** Debits target account, credits `SYS-CLEARING-001`.
2. **Non-Negative Balance Invariant:** A debit adjustment that would cause the target account balance to fall below ₹0.00 is rejected with HTTP 400 (`Insufficient funds for debit adjustment`).
3. **Canonical Row Locking:** Accounts are locked in canonical UUID order (`min(acc1, acc2)` then `max(acc1, acc2)`) to prevent deadlocks with concurrent transfers.
4. **Immutable Audit Record:** Every adjustment writes a row to `engine_accountadjustment` capturing `performed_by`, `previous_balance`, `resulting_balance`, `reason_code`, `note`, and timestamp.
5. **Idempotency Protection:** Repeated submissions with the same `Idempotency-Key` return the previously committed adjustment without applying a second balance mutation.

---

## 4. User Lifecycle Management

Administrators can update user active states safely without violating historical data integrity:

### 4.1 Suspend User
- **URL:** `POST /api/admin/users/<uuid:user_id>/suspend/`
- **Effect:** Sets `is_active = False` on the user and `is_active = False` on all linked accounts. Suspended users cannot log in or initiate transfers.
- **Audit:** Records an `ADMIN_SUSPEND_USER` event in the system audit log.

### 4.2 Reactivate User
- **URL:** `POST /api/admin/users/<uuid:user_id>/reactivate/`
- **Effect:** Sets `is_active = True` on the user and linked accounts.
- **Audit:** Records an `ADMIN_REACTIVATE_USER` event in the system audit log.

### 4.3 Safe Deactivation (Soft Delete)
- **URL:** `POST /api/admin/users/<uuid:user_id>/deactivate/`
- **Safety Guarantee:** Hard deletion (`DELETE FROM auth_user`) is strictly prohibited to preserve historical transactions, ledger rows, and audit trails. Soft deactivation deactivates the user and accounts while retaining all financial history for compliance.

---

## 5. Ledger Reconciliation Engine

The Reconciliation Engine verifies mathematical consistency across all accounts in the database:
- **URL:** `GET /api/admin/reconciliation/`
- **Verification Routine:**
  For every account in the system:
  $$\text{Expected Balance} = \sum \text{Ledger Credits} - \sum \text{Ledger Debits}$$
  $$\text{Discrepancy} = \text{Current Balance} - \text{Expected Balance}$$
- **Clearing Account Audit:** Verifies the net balance and total throughput of `SYS-CLEARING-001`.
- **Response Format:**
  ```json
  {
    "status": "HEALTHY",
    "timestamp": "2026-11-14T17:00:00Z",
    "total_accounts_checked": 28,
    "discrepancies_found": 0,
    "discrepancies": [],
    "system_clearing_account": {
      "account_number": "SYS-CLEARING-001",
      "balance": "-280000.00",
      "currency": "INR"
    }
  }
  ```
  If any account balance does not match its ledger history, status returns `DISCREPANCY_DETECTED` with an itemized breakdown for immediate administrative investigation.
