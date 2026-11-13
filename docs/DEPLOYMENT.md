# DataCore — Production Deployment & Infrastructure Specification

This document provides complete instructions for deploying the DataCore centralized backend, managed PostgreSQL database, and React Admin observability dashboard.

---

## 1. Cloud Architecture Overview

```text
                     INTERNET TRAFFIC
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
        VERCEL EDGE                  RENDER EDGE
      (Admin Frontend)            (Centralized Backend)
              │                           │
              │ HTTPS API Requests        │
              └──────────────────────────►│
                                          ▼
                                GUNICORN WSGI CLUSTER
                                 (4 Workers, 2 Threads)
                                          │
                                          ▼
                                MANAGED POSTGRESQL 16
                                (Row Locks, Transactions)
```

---

## 2. Centralized Backend & Managed PostgreSQL on Render

### 2.1 Render Blueprint Deployment (`render.yaml`)

DataCore uses an automated Infrastructure-as-Code blueprint (`render.yaml`) declaring both the web service and managed PostgreSQL database:

```yaml
services:
  - type: web
    name: datacore-backend
    env: python
    region: oregon
    plan: standard
    buildCommand: "pip install -r backend/requirements.txt && python backend/manage.py collectstatic --no-input && python backend/manage.py migrate"
    startCommand: "gunicorn config.wsgi:application --chdir backend --bind 0.0.0.0:$PORT --workers 4 --threads 2"
    envVars:
      - key: PYTHON_VERSION
        value: 3.12.3
      - key: DEBUG
        value: "False"
      - key: DJANGO_SECRET_KEY
        generateValue: true
      - key: DATABASE_URL
        fromDatabase:
          name: datacore-postgres
          property: connectionString
      - key: ALLOWED_HOSTS
        value: ".onrender.com,localhost"
      - key: CORS_ALLOWED_ORIGINS
        value: "https://datacore-admin.vercel.app,http://localhost:5173"
      - key: SECURE_SSL_REDIRECT
        value: "True"
      - key: SESSION_COOKIE_SECURE
        value: "True"
      - key: CSRF_COOKIE_SECURE
        value: "True"
    healthCheckPath: /health/

databases:
  - name: datacore-postgres
    region: oregon
    plan: standard
    databaseName: datacore_db
    user: datacore_user
```

### 2.2 Environment Variables Reference

| Variable Name | Required | Default / Description |
| :--- | :--- | :--- |
| `DJANGO_SECRET_KEY` | Yes | High-entropy secret key for cryptographic signing. |
| `DEBUG` | Yes | Must be `False` in production. |
| `DATABASE_URL` | Yes | PostgreSQL connection string (`postgres://user:pass@host:5432/db`). |
| `ALLOWED_HOSTS` | Yes | Comma-separated domains allowed to serve traffic. |
| `CORS_ALLOWED_ORIGINS` | Yes | Trusted frontend origins allowed to send API requests with credentials. |
| `SECURE_SSL_REDIRECT` | Yes | Enforces HTTPS redirection (`True` in production). |
| `SESSION_COOKIE_SECURE`| Yes | Restricts session cookies to HTTPS (`True`). |
| `CSRF_COOKIE_SECURE` | Yes | Restricts CSRF cookies to HTTPS (`True`). |
| `DEFAULT_INITIAL_BALANCE` | No | Starting balance for newly registered demo accounts (`10000.00`). |
| `DEFAULT_CURRENCY` | No | Currency symbol/code (`INR`). |

---

## 3. Admin Observability Dashboard on Vercel

### 3.1 Vercel Deployment Settings

1. Connect the GitHub repository to Vercel.
2. Configure project settings:
   - **Framework Preset:** Vite
   - **Root Directory:** `admin-dashboard`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Set Environment Variable:
   - `VITE_API_BASE_URL`: `https://<your-render-app>.onrender.com`
4. Deploy.

---

## 4. Zero-Downtime Migration & Rollback Strategy

1. **Pre-Deployment Check:** Run `python manage.py makemigrations --check --dry-run` to detect uncommitted schema changes.
2. **Backward-Compatible Operations:**
   - Always add new columns as `null=True` or with server-side defaults.
   - Never rename or drop columns without a multi-phase migration.
3. **Database Health Verification:** The `/health/` endpoint automatically checks database connectivity and returns HTTP 200 when ready.
