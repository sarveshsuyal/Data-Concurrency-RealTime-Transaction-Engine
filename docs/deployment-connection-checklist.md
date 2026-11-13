# DataCore Deployment & Connection Checklist

This document details the exact configuration steps required across Render, Vercel, Supabase, and GitHub Actions to keep the entire platform synchronized.

---

## 1. Render Backend (`datacore-backend`)

* **Deployed Web Service Name:** `datacore-backend`
* **Service ID:** `srv-dbrlcerbc2fs73cenhb0`
* **Canonical Base URL:** `https://datacore-backend-wktd.onrender.com`
* **Health Check Endpoint:** `https://datacore-backend-wktd.onrender.com/health/`
* **Root Discovery Endpoint:** `https://datacore-backend-wktd.onrender.com/`

### Environment Variables on Render
Set under **Render Dashboard** > **`datacore-backend`** > **Environment**:
1. `PYTHON_VERSION`: `3.12.3`
2. `DEBUG`: `False`
3. `DJANGO_SECRET_KEY`: *(Auto-generated secret string)*
4. `ALLOWED_HOSTS`: `.onrender.com,localhost`
5. `CORS_ALLOW_ALL_ORIGINS`: `True`
6. `DATABASE_URL`: *(Supabase PostgreSQL connection string)*
   ```text
   postgresql://postgres.kphdytcnwanrmudtcojz:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
   ```

---

## 2. Vercel Frontend (`admin-dashboard`)

* **Vercel Project:** `admin-dashboard`
* **Root Directory:** `admin-dashboard`
* **Production Domain:** `https://transactionenngine.vercel.app`
* **Build Command:** `npm run build`
* **Output Directory:** `dist`

### Configuration Steps
1. Under **Vercel Settings** > **Environment Variables**:
   * Add: `VITE_API_BASE_URL` = `https://datacore-backend-wktd.onrender.com`
2. Even without setting the environment variable manually, the dashboard includes:
   * Automatic reverse-proxy rewrites in `admin-dashboard/vercel.json` routing `/api/*` to Render.
   * Production fallback in `api.ts` pointing to `https://datacore-backend-wktd.onrender.com`.
3. To apply the latest build, trigger **Redeploy** on the latest deployment in Vercel.

---

## 3. Flutter Android App (APK Generation)

* **Architecture:** Standalone Android customer client application.
* **Backend Target:** `https://datacore-backend-wktd.onrender.com`
* **CI/CD Workflow:** `.github/workflows/build-apk.yml`

### Building the APK
1. Every push to `main` touching `mobile-app/**` builds automatically in GitHub Actions.
2. To trigger a manual build with a custom backend:
   * Open the **Actions** tab on GitHub > **Build DataCore Android APK** > **Run workflow**.
   * Input `Backend API Base URL`: `https://datacore-backend-wktd.onrender.com`.
3. Download the generated `DataCore-Android-APK` (`app-release.apk`) directly from the workflow run artifacts.

---

## 4. Uptime Monitoring (UptimeRobot)

* **Target URL:** `https://datacore-backend-wktd.onrender.com/health/`
* **HTTP Method:** `GET` or `HEAD` (both return HTTP 200).
* **Interval:** 5 minutes or 10 minutes.
* **Note on Render Free Tier:** Render Free web services spin down after 15 minutes of inactivity. The first wake-up request takes ~30–50s. The health endpoint responds with lightweight status 200 without loading database models.
