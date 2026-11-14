# DataCore Four-Part Architecture Deployment Validation Report

**Validation Timestamp:** 2026-11-14T11:30:00Z  
**Target Environments:**  
1. **Render Django REST API:** `https://datacore-backend-wktd.onrender.com`  
2. **Supabase PostgreSQL Database:** `https://kphdytcnwanrmudtcojz.supabase.co`  
3. **Vercel Admin Dashboard:** `https://transactionenngine.vercel.app`  
4. **Flutter Customer Mobile App:** Native Android Release APK  

---

## 1. Live Endpoint Verification Log

| Target URL / Endpoint | HTTP Method | Auth Requirement | HTTP Status | Response Shape / Verification Result |
| :--- | :--- | :--- | :--- | :--- |
| `https://datacore-backend-wktd.onrender.com/` | `GET`, `HEAD` | Public | `200 OK` | `{"service": "DataCore API", "status": "running", "health": "/health/"}` |
| `https://datacore-backend-wktd.onrender.com/health/` | `GET`, `HEAD` | Public | `200 OK` | `{"status": "healthy", "service": "datacore-backend"}` |
| `https://datacore-backend-wktd.onrender.com/api/auth/login/` | `POST` | Public | `200 OK` | Returns JWT `access`, `refresh`, and user profile payload. |
| `https://datacore-backend-wktd.onrender.com/api/accounts/` | `GET` | Bearer Token (Customer) | `200 OK` | Returns authenticated user's active accounts with authoritative decimal balance. |
| `https://datacore-backend-wktd.onrender.com/api/admin/overview/` | `GET` | Bearer Token (Admin Role) | `200 OK` | Returns aggregate metrics, transaction volume, and double-entry consistency audit. |
| `https://datacore-backend-wktd.onrender.com/api/admin/users/` | `GET` | Bearer Token (Admin Role) | `200 OK` | Returns registered users, account numbers, balances, and transaction counts. |
| `https://datacore-backend-wktd.onrender.com/api/admin/users/` | `GET` | None / Non-Admin | `401 Unauthorized` / `403 Forbidden` | Server-side role enforcement blocks unauthorized access. |
| `https://transactionenngine.vercel.app/` | `GET` | Public | `200 OK` | Serves production Vite bundle (`index-UUmOM-KQ.js`, `index-Dr2yABcc.css`). |
| `https://transactionenngine.vercel.app/users` | `GET` | Client-side Guard + Admin JWT | `200 OK` | SPA client routing rewrite verified (`vercel.json`). Unauthenticated redirects to `/login`. |

---

## 2. Infrastructure Configuration Checks

- **Authoritative Business Layer:** Render Django API is the sole layer permitted to mutate ledger entries and balances. Direct client database mutations are completely prohibited.
- **CORS & Allowed Hosts:** Render backend accepts requests from `transactionenngine.vercel.app` and mobile user agents.
- **Database Connection Security:** Supabase connection requires SSL (`sslmode=require`). No plaintext connection strings or credentials are logged or exposed.
- **Static Assets & SPA Routing:** Vercel reverse proxy routes configured via `vercel.json` to prevent 404 errors on deep linking (`/users`, `/transactions`, `/concurrency`).
- **No Client Secrets:** Inspected production Vite JavaScript bundles and Flutter APK source. Zero Supabase service-role keys, Django secret keys, or database credentials are embedded.
