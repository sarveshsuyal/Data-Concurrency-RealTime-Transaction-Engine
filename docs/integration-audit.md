# DataCore System Integration Audit & Map

## 1. System Overview & Deployment Roles

| Project Subdirectory | Runtime / Framework | Hosting Environment | Current Deployed URL / Identifier | Role & Responsibilities |
| :--- | :--- | :--- | :--- | :--- |
| **`backend/`** | Python 3.12 / Django 5.0 / DRF | Render Web Service | `https://datacore-backend-wktd.onrender.com` | Authoritative single REST API, concurrency engine, double-entry ledger, JWT issuer. |
| **`admin-dashboard/`** | React 18 / TypeScript / Vite | Vercel | `https://transactionenngine.vercel.app` | Administrative observability UI, real-time transaction monitor, RaceLab experiments. |
| **`mobile-app/`** | Flutter 3.x / Dart | Android Release APK | Client APK (built via GitHub Actions) | Customer-facing wallet, transfers, balance inspection, idempotency protection. |
| **Database** | PostgreSQL 17 (Supabase) / SQLite | Supabase / Render Built-in | `db.kphdytcnwanrmudtcojz.supabase.co` | ACID transactions, row-level locks (`SELECT FOR UPDATE`), ledger conservation. |

---

## 2. Client API Base URL Configuration

### React Admin Dashboard
- **Primary Mechanism:** `import.meta.env.VITE_API_BASE_URL` defined at Vite build time.
- **Fallback Mechanism:** Defaults directly to `https://datacore-backend-wktd.onrender.com` in `src/services/api.ts`.
- **Edge Proxy Fallback:** `admin-dashboard/vercel.json` provides an automatic reverse-proxy rewrite:
  ```json
  { "source": "/api/(.*)", "destination": "https://datacore-backend-wktd.onrender.com/api/$1" }
  ```
  This ensures that both relative and absolute requests route correctly even before environment variables are set in Vercel.

### Flutter Mobile App
- **Primary Mechanism:** Compile-time `--dart-define=API_BASE_URL=https://datacore-backend-wktd.onrender.com`.
- **Code Fallback:** Defaults directly to `https://datacore-backend-wktd.onrender.com` in `lib/services/api_service.dart`.
- **Timeouts:** Configured with 45s `connectTimeout` and `receiveTimeout` to accommodate Render Free cold starts without throwing false credential errors.

---

## 3. Comprehensive API Route & Contract Mapping

| Client Request Route | HTTP Method | Django Backend Pattern | Controller / View | Auth Required? | Verified Working? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/` | `GET`, `HEAD` | `path('', root_view)` | `config.urls.root_view` | No | Yes (200 OK) |
| `/health/` | `GET`, `HEAD` | `path('health/', health_check)` | `config.urls.health_check` | No | Yes (200 OK) |
| `/api/auth/register/` | `POST` | `path('register/', RegisterView)` | `authentication.views.RegisterView` | No | Yes (201 Created) |
| `/api/auth/login/` | `POST` | `path('login/', LoginView)` | `authentication.views.LoginView` | No | Yes (200 OK) |
| `/api/auth/logout/` | `POST` | `path('logout/', LogoutView)` | `authentication.views.LogoutView` | Yes (JWT) | Yes (200 OK) |
| `/api/auth/profile/` | `GET` | `path('profile/', ProfileView)` | `authentication.views.ProfileView` | Yes (JWT) | Yes (200 OK) |
| `/api/auth/heartbeat/` | `POST` | `path('heartbeat/', HeartbeatView)` | `authentication.views.HeartbeatView` | Yes (JWT) | Yes (200 OK) |
| `/api/accounts/` | `GET` | `path('accounts/', AccountListView)` | `engine.views.AccountListView` | Yes (JWT) | Yes (200 OK) |
| `/api/transactions/` | `GET`, `POST` | `path('transactions/', TransactionListCreateView)` | `engine.views.TransactionListCreateView` | Yes (JWT) | Yes (200 OK) |
| `/api/transactions/<id>/` | `GET` | `path('transactions/<uuid:pk>/', TransactionDetailView)` | `engine.views.TransactionDetailView` | Yes (JWT) | Yes (200 OK) |
| `/api/admin/overview/` | `GET` | `path('admin/overview/', AdminOverviewView)` | `engine.views.AdminOverviewView` | Yes (Admin JWT) | Yes (200 OK) |
| `/api/admin/transactions/` | `GET` | `path('admin/transactions/', AdminTransactionListView)` | `engine.views.AdminTransactionListView` | Yes (Admin JWT) | Yes (200 OK) |
| `/api/admin/metrics/` | `GET` | `path('admin/metrics/', AdminMetricsView)` | `engine.views.AdminMetricsView` | Yes (Admin JWT) | Yes (200 OK) |
| `/api/admin/concurrency/` | `GET` | `path('admin/concurrency/', AdminConcurrencyEventsView)` | `engine.views.AdminConcurrencyEventsView` | Yes (Admin JWT) | Yes (200 OK) |
| `/api/admin/experiments/` | `GET`, `POST` | `path('admin/experiments/', AdminExperimentView)` | `engine.views.AdminExperimentView` | Yes (Admin JWT) | Yes (200 OK) |
| `/api/admin/users/` | `GET` | `path('admin/users/', AdminUsersView)` | `engine.views.AdminUsersView` | Yes (Admin JWT) | Yes (200 OK) |
| `/api/admin/audit-logs/` | `GET` | `path('admin/audit-logs/', AdminAuditLogsView)` | `engine.views.AdminAuditLogsView` | Yes (Admin JWT) | Yes (200 OK) |
| `/api/admin/duplicates/` | `GET` | `path('admin/duplicates/', AdminDuplicatesView)` | `engine.views.AdminDuplicatesView` | Yes (Admin JWT) | Yes (200 OK) |

---

## 4. Authentication Lifecycle Comparison

| Lifecycle Stage | React Admin Dashboard | Flutter Customer Mobile App |
| :--- | :--- | :--- |
| **Login Request** | `POST /api/auth/login/` with `{ email, password }` | `POST /api/auth/login/` with `data: { email, password }` |
| **Token Extraction** | Extracts `response.data.access` & `refresh` | Extracts `response.data['access']` & `refresh` |
| **Token Storage** | `localStorage.setItem('datacore_admin_token')` | `FlutterSecureStorage().write(key: 'access_token')` |
| **Request Interceptor** | Injects `Authorization: Bearer <token>` in Axios | Injects `Authorization: Bearer <token>` in Dio |
| **401 Expiry Handling** | Removes tokens, redirects to `/login` | Deletes secure storage only on HTTP 401 |
| **Cold Start / Timeout** | Informs user that Render Free is waking up | Bounded 45s wait, informs user server is waking |
| **Logout Request** | `POST /api/auth/logout/` with `{ refresh }` | `POST /api/auth/logout/` with `data: { refresh }` |

---

## 5. Security, CORS & Environment Variables

### Django CORS Allowlist
The Django backend permits:
- Origin: `https://transactionenngine.vercel.app` (verified via preflight HTTP OPTIONS 200)
- Wildcard Regex: `r"^https:\/\/.*\.vercel\.app$"` (covers preview deployments)
- Local Dev: `http://localhost:5173`, `http://localhost:3000`, `http://127.0.0.1:5173`

### Required Environment Variables (Names Only)
- **Render Backend (`datacore-backend`):**
  - `PYTHON_VERSION`
  - `DEBUG`
  - `DJANGO_SECRET_KEY`
  - `ALLOWED_HOSTS`
  - `CORS_ALLOW_ALL_ORIGINS`
  - `DATABASE_URL` (optional: connect Supabase PostgreSQL)
- **Vercel Frontend (`admin-dashboard`):**
  - `VITE_API_BASE_URL` (optional due to proxy rewrite and code fallback)
