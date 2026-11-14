# DataCore Authoritative REST API Contract Specification

**Base Production URL:** `https://datacore-backend-wktd.onrender.com`  
**Authentication Scheme:** `Authorization: Bearer <jwt-access-token>`  
**Idempotency Header:** `Idempotency-Key: <unique-uuid-v4>`

---

## 1. Authentication Endpoints

### 1.1 Customer Registration
- **Endpoint:** `POST /api/auth/register/`
- **Auth:** Public
- **Request:**
  ```json
  {
    "full_name": "Jane Doe",
    "email": "jane@example.com",
    "password": "SecurePassword123!",
    "confirm_password": "SecurePassword123!"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "message": "User registered successfully.",
    "user": {
      "id": "c3a9f021-39e1-45bc-8a71-6e3e5b3f1122",
      "email": "jane@example.com",
      "full_name": "Jane Doe",
      "role": "USER",
      "date_joined": "2026-11-14T10:00:00Z",
      "last_heartbeat": "2026-11-14T10:00:00Z"
    },
    "access": "eyJhbGciOi...",
    "refresh": "eyJhbGciOi..."
  }
  ```

### 1.2 User Login
- **Endpoint:** `POST /api/auth/login/`
- **Auth:** Public
- **Request:**
  ```json
  {
    "email": "jane@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "user": {
      "id": "c3a9f021-39e1-45bc-8a71-6e3e5b3f1122",
      "email": "jane@example.com",
      "full_name": "Jane Doe",
      "role": "USER"
    },
    "access": "eyJhbGciOi...",
    "refresh": "eyJhbGciOi..."
  }
  ```

### 1.3 Token Refresh
- **Endpoint:** `POST /api/auth/refresh/`
- **Request:** `{"refresh": "<jwt-refresh-token>"}`
- **Response (200 OK):** `{"access": "<new-jwt-access-token>"}`

---

## 2. Customer Account & Transfer Endpoints

### 2.1 List Owned Accounts
- **Endpoint:** `GET /api/accounts/`
- **Auth:** Bearer Token
- **Response (200 OK):**
  ```json
  [
    {
      "id": "e4b2d184-9345-423c-a9df-6d7c88019ab3",
      "account_number": "DC-4892-1029",
      "user_email": "jane@example.com",
      "user_name": "Jane Doe",
      "balance": "0.00",
      "currency": "INR",
      "version": 0,
      "is_active": true,
      "created_at": "2026-11-14T10:00:00Z"
    }
  ]
  ```

### 2.2 Execute Fund Transfer
- **Endpoint:** `POST /api/transactions/`
- **Auth:** Bearer Token
- **Header:** `Idempotency-Key: <uuid-v4>`
- **Request:**
  ```json
  {
    "receiver_identifier": "bob@datacore.io",
    "amount": "250.00",
    "description": "Lunch split",
    "concurrency_strategy": "PESSIMISTIC"
  }
  ```
- **Response (201 Created / 200 OK if cached):**
  ```json
  {
    "id": "a918e745-1234-4567-89ab-cdef01234567",
    "sender_account": "DC-4892-1029",
    "receiver_account": "DC-2688-3516",
    "amount": "250.00",
    "currency": "INR",
    "status": "COMPLETED",
    "concurrency_strategy": "PESSIMISTIC",
    "idempotency_key": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "sender_balance_after": "750.00",
    "latency_ms": 5.4,
    "created_at": "2026-11-14T10:05:00Z",
    "completed_at": "2026-11-14T10:05:00Z"
  }
  ```

### 2.3 Transaction History
- **Endpoint:** `GET /api/transactions/history/?page=1&page_size=20`
- **Auth:** Bearer Token
- **Response (200 OK):** Paginated transactions with sender/receiver details, timestamps, and status.

---

## 3. Administrator Financial & Operational Endpoints

### 3.1 Platform Overview
- **Endpoint:** `GET /api/admin/overview/`
- **Auth:** Bearer Token (`role == ADMIN`)
- **Response (200 OK):**
  ```json
  {
    "metrics": {
      "total_users": 5,
      "active_users": 2,
      "total_transactions": 14,
      "completed_transactions": 14,
      "failed_transactions": 0,
      "duplicate_requests_handled": 4,
      "throughput_last_hour": 10,
      "average_latency_ms": 7.2
    },
    "financial_consistency": {
      "total_system_balance": "34500.00",
      "total_ledger_debits": "34500.00",
      "total_ledger_credits": "34500.00",
      "ledger_invariants_balanced": true
    }
  }
  ```

### 3.2 User Search, Filtering & Pagination
- **Endpoint:** `GET /api/admin/users/?search=&role=&is_active=&min_balance=&max_balance=&page=1&page_size=20`
- **Auth:** Bearer Token (`role == ADMIN`)
- **Response (200 OK):**
  ```json
  {
    "count": 5,
    "next": null,
    "previous": null,
    "results": [
      {
        "id": "8d0a804a-aa15-4324-860d-886581dac1e5",
        "email": "alice@datacore.io",
        "full_name": "Alice Johnson",
        "role": "USER",
        "is_active": true,
        "date_joined": "2026-11-14T09:53:47Z",
        "last_heartbeat": "2026-11-14T11:24:03Z",
        "accounts": [
          {
            "id": "c0480d73-4064-4363-8c70-16030c2cab20",
            "account_number": "DC-3896-3659",
            "balance": "9250.00",
            "currency": "INR"
          }
        ],
        "total_transactions": 2
      }
    ]
  }
  ```

### 3.3 User Detail View
- **Endpoint:** `GET /api/admin/users/<uuid:user_id>/`
- **Auth:** Bearer Token (`role == ADMIN`)
- **Response (200 OK):** Complete user record, linked accounts with balances, 20 most recent transactions, adjustment history, and security audit activity.

### 3.4 Manual Credit/Debit Adjustment
- **Endpoint:** `POST /api/admin/accounts/<uuid:account_id>/adjustments/`
- **Auth:** Bearer Token (`role == ADMIN`)
- **Header:** `Idempotency-Key: <unique-op-key>`
- **Request:**
  ```json
  {
    "operation": "credit",
    "amount": "250.00",
    "currency": "INR",
    "reason_code": "ADMIN_CORRECTION",
    "admin_note": "Approved correction, case DC-1234"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "id": "f583e201-9876-4321-ba98-123456789abc",
    "account_id": "c0480d73-4064-4363-8c70-16030c2cab20",
    "account_number": "DC-3896-3659",
    "operation": "credit",
    "amount": "250.00",
    "currency": "INR",
    "previous_balance": "9250.00",
    "new_balance": "9500.00",
    "reason_code": "ADMIN_CORRECTION",
    "admin_note": "Approved correction, case DC-1234",
    "created_at": "2026-11-14T11:30:00Z"
  }
  ```

### 3.5 User Lifecycle Controls
- **Suspend:** `POST /api/admin/users/<uuid:user_id>/suspend/`
  - Body: `{"reason": "Risk review pending"}`
- **Reactivate:** `POST /api/admin/users/<uuid:user_id>/reactivate/`
  - Body: `{"reason": "Identity verified"}`
- **Safe Deactivate:** `POST /api/admin/users/<uuid:user_id>/deactivate/`
  - Body: `{"reason": "Customer request", "confirm": true}`

### 3.6 Ledger Reconciliation View
- **Endpoint:** `GET /api/admin/reconciliation/`
- **Auth:** Bearer Token (`role == ADMIN`)
- **Response (200 OK):**
  ```json
  {
    "total_accounts_checked": 5,
    "discrepancies_found": 0,
    "accounts_in_balance": 5,
    "system_wide_debits": "34500.00",
    "system_wide_credits": "34500.00",
    "is_system_balanced": true,
    "discrepancies": []
  }
  ```

---

## 4. Real-Time Streaming Endpoints

### 4.1 Server-Sent Events (SSE)
- **Endpoint:** `GET /api/events/stream/`
- **Auth:** Bearer Token or query parameter `?token=<jwt-access-token>`
- **Header:** `Last-Event-ID: <id>` (optional, for replay)
- **Format:** `text/event-stream`
- **Payload:**
  ```text
  id: evt_98213890123
  event: transaction.completed
  data: {"tx_id": "a918e745...", "amount": "250.00", "new_balance": "9500.00", "type": "CREDIT", "timestamp": "2026-11-14T11:30:00Z"}
  ```

### 4.2 Missed Event Recovery (Polling Fallback)
- **Endpoint:** `GET /api/events/my/?since=<iso8601-timestamp>&after_id=<event-id>`
- **Auth:** Bearer Token
- **Response (200 OK):** Array of events since the requested cursor.
