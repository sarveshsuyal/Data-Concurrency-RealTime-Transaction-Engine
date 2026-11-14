# DataCore Architecture Audit & Codebase Consolidation Report

**Repository:** `Data-Concurrency-RealTime-Transaction-Engine`  
**Target Branch:** `main`  
**Date:** November 2026  
**Status:** Canonical Monorepo Verified & Audited

---

## 1. Directory & Architecture Map

The project is structured as a unified monorepo supporting four integrated execution environments:

```text
Data-Concurrency-RealTime-Transaction-Engine/
├── backend/                             # Django 5.0 REST API Service
│   ├── authentication/                  # Custom User model (UUID), JWT auth, profile, heartbeats
│   ├── config/                          # WSGI, settings (dj-database-url, CORS, SSL), URLs
│   ├── engine/                          # Authoritative financial engine
│   │   ├── concurrency.py               # Concurrency handlers (Pessimistic, Optimistic, Atomic, Unsafe)
│   │   ├── models.py                    # Account, Transaction, LedgerEntry, IdempotencyKey, etc.
│   │   ├── permissions.py               # IsAdminUserRole, IsAccountOwner
│   │   ├── serializers.py               # DRF serializers with positive decimal & idempotency validation
│   │   ├── services.py                  # TransferService, RaceExperimentService, AdjustmentService
│   │   ├── urls.py                      # Customer & Administrator routes
│   │   └── views.py                     # API views (Customer + Admin + SSE EventStream)
│   ├── tests/                           # Django test suites (auth, transactions, concurrency, integrity)
│   └── manage.py
├── admin-dashboard/                     # React 18 + TypeScript + Vite + Tailwind CSS Admin Console
│   ├── src/
│   │   ├── components/                  # Header, Sidebar, MetricCard, CustomerMobileApp
│   │   ├── pages/                       # Overview, Transactions, Concurrency, RaceLab, DuplicateDetection,
│   │   │                                # Consistency, Users, AuditLogs, CustomerSimulator, Login
│   │   ├── services/api.ts              # Canonical Axios client with JWT interceptor & auto-logout
│   │   ├── types/                       # TypeScript interfaces
│   │   ├── App.tsx                      # Protected routes & client layout
│   │   └── main.tsx
│   ├── .env.production                  # VITE_API_BASE_URL=https://datacore-backend-wktd.onrender.com
│   └── package.json
├── mobile-app/                          # Native Flutter Customer Application
│   ├── lib/
│   │   ├── models/                      # AccountModel, TransactionModel, UserModel
│   │   ├── providers/                   # AuthProvider, AccountProvider
│   │   ├── screens/                     # Splash, Login, Register, Home, Transfer, History, Profile
│   │   ├── services/                    # ApiService (Dio + FlutterSecureStorage + Bearer token)
│   │   ├── theme/                       # AppTheme (DataCore brand identity)
│   │   └── widgets/                     # BalanceCard, QuickActions, ServicesHub, ReceiveQr, PinSheet
│   ├── test/                            # Flutter smoke & unit tests
│   └── pubspec.yaml
├── .github/workflows/                   # GitHub Actions CI/CD
│   └── build-apk.yml                    # Automated release APK build with Android scaffolding & test gates
├── docs/                                # Technical specifications, audit reports & runbooks
├── render.yaml                          # Render Blueprint infrastructure deployment configuration
└── vercel.json                          # Vercel SPA routing rewrites
```

---

## 2. Duplicate & Overlapping Responsibilities Audit

| Subsystem | Implementations Found | Canonical Implementation Selected | Migration & Consolidation Action |
| :--- | :--- | :--- | :--- |
| **API Base URL** | Hardcoded localhost URLs, `.env` fallbacks, Vite env vars | Single canonical environment-driven URL defaulting to `https://datacore-backend-wktd.onrender.com` | Standardized across `admin-dashboard/src/services/api.ts` and `mobile-app/lib/services/api_service.dart`. |
| **Authentication & Tokens** | Multiple local storage keys (`datacore_token`, `admin_token`, secure storage) | `datacore_admin_token` (dashboard) and `flutter_secure_storage` key `access_token` (Flutter) | Isolated tokens cleanly per application surface; refresh lifecycle handled centrally. |
| **Balance Representation** | Number vs String vs Decimal in various layers | Python `Decimal(max_digits=14, decimal_places=2)`, string in JSON API, `Decimal` parsing in clients | Prohibited binary floating-point representation for money across all financial paths. |
| **Ledger Recording** | Single-leg deposit in seed/register vs double-entry in transfers | Canonical double-entry ledger where every credit has a matching debit | Introduced `SYSTEM_CLEARING` account so initial deposits and admin adjustments strictly balance (`debits == credits`). |
| **User Simulator Client** | Direct web preview in `preview.html` vs React `CustomerMobileApp.tsx` vs Flutter app | Flutter app is production customer app; `CustomerMobileApp.tsx` in admin console consumes real backend REST API | `preview.html` retains standalone preview utility; all core functionality mirrored in native Flutter UI. |
| **Event Transport** | Polling intervals vs Server-Sent Events (`/api/events/stream/`) | Server-Sent Events (SSE) with authenticated cursor (`Last-Event-ID`) and authenticated polling recovery fallback | Unified real-time updates onto `/api/events/stream/` with `/api/events/my/` fallback. |

---

## 3. Safe Deletion & Dead Code Resolution

- **Seed Data in Production Builds:** Removed `setup_datacore` execution from `render.yaml` `buildCommand`. Production deployments must only run `collectstatic` and `migrate`. Seeding is reserved strictly for local testing.
- **Redundant UI Elements:**
  - Removed "UPI Lite" shortcut from Home screen quick actions grid.
  - Removed redundant "Check Balance" button because authoritative live balance is already prominently displayed on the primary `BalanceCard`.
  - Replaced legacy PhonePe branding with DataCore Master Brand identity.
- **Stale Fallback Logic:**
  - Removed all `|| 10000.00` falsy fallbacks in serializers, clients, and preview scripts that caused ₹0.00 balances to revert to ₹10,000.00.

---

## 4. Preservation Invariant

No working customer or administrator feature has been removed. All routes (`/`, `/transactions`, `/concurrency`, `/race-lab`, `/duplicates`, `/consistency`, `/users`, `/audit-logs`, `/customer-app`), transfer concurrency strategies (Pessimistic, Optimistic, Atomic, Unsafe), idempotency deduplication, and financial audit logs remain active and fully tested.
