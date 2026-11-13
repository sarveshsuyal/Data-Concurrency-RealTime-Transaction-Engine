# DataCore | Real-Time Data Concurrency & Transaction Engine

[![Django](https://img.shields.io/badge/Django-5.0-092E20?style=for-the-badge&logo=django&logoColor=white)](https://www.djangoproject.com/)
[![DRF](https://img.shields.io/badge/Django_REST_Framework-3.15-red?style=for-the-badge)](https://www.django-rest-framework.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Flutter](https://img.shields.io/badge/Flutter-3.x-02569B?style=for-the-badge&logo=flutter&logoColor=white)](https://flutter.dev/)

A cross-platform transaction processing system demonstrating database concurrency control, race-condition prevention, duplicate transaction suppression, and mathematical data consistency through double-entry bookkeeping.

---

## 1. System Architecture

```text
                    GITHUB MONOREPO
                           |
             +-------------+-------------+
             |                           |
       FLUTTER APP                 REACT ADMIN
       Android APK                    Vercel
             |                           |
             +-------------+-------------+
                           |
                    HTTPS REST API
                           |
                 DJANGO REST FRAMEWORK
                   ONE RENDER SERVICE
                           |
                       POSTGRESQL
                  ONE MANAGED DATABASE
```

* **One Centralized Backend:** Single Django REST Framework web service deployed to Render.
* **One Authoritative Database:** Managed PostgreSQL database enforcing row locks, version increments, unique constraints, and atomic transactions.
* **Customer Interface:** Native Flutter Android application for customer fund transfers, account inspection, and balance tracking.
* **Admin Interface:** React + TypeScript + Vite + Tailwind CSS dashboard deployed to Vercel for real-time observability, live transaction monitoring, and controlled race-condition experiments.

---

## 2. Key Engineering Highlights

* **Double-Entry Ledger Invariant:** Every transfer atomically commits matching debit and credit ledger records:
  $$\sum \text{Debits} = \sum \text{Credits}$$
* **Deadlock-Free Pessimistic Locking:** Canonical sorting of row locks (`SELECT FOR UPDATE`) prevents deadlocks across concurrent transfers.
* **Optimistic Locking:** Version checks (`UPDATE ... WHERE version = V`) cleanly detect and abort concurrent modification races.
* **Duplicate Submission Protection:** SHA-256 request fingerprinting with client `Idempotency-Key` headers prevents double charges.
* **Race-Condition Laboratory:** Real-time multi-threaded testing environment demonstrating check-then-act vulnerabilities versus protected execution.

---

## 3. Project Structure

```text
Data-Concurrency-RealTime-Transaction-Engine/
├── backend/                  # Centralized Django REST Framework backend
│   ├── config/               # Settings, WSGI, root URL routing
│   ├── authentication/       # Custom User model, JWT auth, RBAC permissions
│   ├── engine/               # Accounts, Transactions, Double-entry Ledger, Concurrency
│   ├── tests/                # Automated tests (Auth, Transactions, Multi-threaded Concurrency)
│   ├── manage.py
│   └── requirements.txt
├── admin-dashboard/          # React + TypeScript + Vite + Tailwind Admin Dashboard
│   ├── src/
│   │   ├── components/       # Metric cards, Sidebar, Header
│   │   ├── pages/            # Overview, Transactions, Concurrency, RaceLab, Users, Audit
│   │   ├── services/         # Axios API client with JWT interceptors
│   │   └── types/            # TypeScript interfaces
│   ├── package.json
│   └── vite.config.ts
├── mobile-app/               # Flutter Customer Mobile Application
│   ├── lib/
│   │   ├── models/           # Account, User, Transaction Dart models
│   │   ├── providers/        # Auth & Account state management
│   │   ├── screens/          # Splash, Login, Register, Home, Transfer, History, Profile
│   │   └── services/         # Dio HTTP client with secure token storage
│   └── pubspec.yaml
├── docs/                     # Comprehensive architecture and API specifications
│   ├── architecture.md
│   ├── api-contract.md
│   └── experiments.md
├── render.yaml               # Render Blueprint (Django service + Managed PostgreSQL)
├── .env.example              # Environment variable template
└── README.md
```

---

## 4. Quick Start & Local Setup

### Prerequisites
* Python 3.12+
* Node.js 18+ & npm
* PostgreSQL (or SQLite for quick local test)
* Flutter 3.x (optional for mobile development)

### 4.1 Backend Setup

1. **Navigate to backend and create a virtual environment:**
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Configure environment:**
   ```bash
   cp ../.env.example .env
   ```

3. **Run database migrations:**
   ```bash
   python manage.py migrate
   ```

4. **Seed database with default admin and demo customers:**
   ```bash
   python manage.py setup_datacore
   ```
   * **Admin Credentials:** `admin@datacore.io` / `AdminPassword123!`
   * **Demo Customer:** `alice@datacore.io` / `Password123!`
   * **Demo Customer:** `bob@datacore.io` / `Password123!`

5. **Run automated test suite:**
   ```bash
   python manage.py test tests/
   ```

6. **Start Django development server:**
   ```bash
   python manage.py runserver 0.0.0.0:8000
   ```

---

### 4.2 React Admin Dashboard Setup

1. **Navigate to admin-dashboard and install dependencies:**
   ```bash
   cd admin-dashboard
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```
   * **Admin Observability Portal:** Open `http://localhost:5173` in your browser. Sign in using `admin@datacore.io` / `AdminPassword123!`.
   * **Customer Mobile App Simulator:** Open `http://localhost:5173/customer` to test live customer transfers and wallet balances.

---

### 4.3 Flutter Mobile Application Setup

1. **Navigate to mobile-app:**
   ```bash
   cd mobile-app
   ```

2. **Run on Chrome (Web on Localhost):**
   ```bash
   flutter create --platforms=web .
   flutter pub get
   flutter run -d chrome --web-port=3000
   ```

3. **Or run on Android Emulator:**
   ```bash
   flutter create --platforms=android .
   flutter pub get
   flutter run
   ```

---

## 5. Deployment Guide (3-Side Architecture)

### 5.1 Side 1: Admin Dashboard on Vercel
Deploy the React + Vite + Tailwind CSS admin dashboard globally on Vercel with automated continuous deployment.

#### Option A: Via Vercel Web Dashboard (Recommended)
1. Navigate to [vercel.com](https://vercel.com) and log in.
2. Click **Add New...** > **Project**.
3. Import your GitHub repository (`sarveshsuyal/Data-Concurrency-RealTime-Transaction-Engine`).
4. In the **Configure Project** screen:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select `admin-dashboard`.
   - **Build Command**: `npm run build` (or leave default `tsc && vite build`)
   - **Output Directory**: `dist`
5. Expand **Environment Variables**:
   - `VITE_API_BASE_URL`: Enter your live Render backend URL (e.g., `https://datacore-backend.onrender.com`).
6. Click **Deploy**. Vercel will build and assign an HTTPS URL (e.g., `https://datacore-admin.vercel.app`).

#### Option B: Via Vercel CLI
```bash
cd admin-dashboard
npx vercel
# Follow prompts: Link to existing project or create new, set build settings
# Set production environment variable:
npx vercel env add VITE_API_BASE_URL production
# Deploy to production:
npx vercel --prod
```

---

### 5.2 Side 2: Centralized Backend on Render
Deploy the Django REST Framework backend on Render. You can deploy directly **without a separate database** using Django's built-in SQLite, or connect a managed PostgreSQL instance for production-grade row locks.

#### Option A: Direct Web Service (Zero Separate Database Required)
1. Go to [dashboard.render.com](https://dashboard.render.com) and click **New +** > **Web Service**.
2. Connect your GitHub repository (`sarveshsuyal/Data-Concurrency-RealTime-Transaction-Engine`).
3. Configure the service settings:
   - **Name**: `datacore-backend`
   - **Region**: Oregon (or your preferred region)
   - **Branch**: `main`
   - **Root Directory**: (Leave blank — root of repo)
   - **Runtime**: `Python 3`
   - **Build Command**:
     ```bash
     pip install -r backend/requirements.txt && python backend/manage.py collectstatic --no-input && python backend/manage.py migrate && python backend/manage.py setup_datacore
     ```
   - **Start Command**:
     ```bash
     gunicorn config.wsgi:application --chdir backend --bind 0.0.0.0:$PORT --workers 4 --threads 2
     ```
   - **Instance Type**: `Free`
4. Add the following **Environment Variables**:
   - `PYTHON_VERSION`: `3.12.3`
   - `DEBUG`: `False`
   - `DJANGO_SECRET_KEY`: Generate a random secure string (or click Generate)
   - `ALLOWED_HOSTS`: `.onrender.com,localhost`
   - `CORS_ALLOW_ALL_ORIGINS`: `True`
   - `SECURE_SSL_REDIRECT`: `True`
   - `SESSION_COOKIE_SECURE`: `True`
   - `CSRF_COOKIE_SECURE`: `True`
5. Click **Create Web Service**. Render will install dependencies, collect static assets via WhiteNoise, execute migrations, and automatically run `setup_datacore` to seed the admin user (`admin@datacore.io` / `AdminPassword123!`) and demo customer accounts.

#### Option B: Using Render Blueprint (`render.yaml`)
1. In Render, select **Blueprints** > **New Blueprint Instance**.
2. Connect this repository; Render automatically detects `render.yaml`.
3. *(Optional)* If you want a managed PostgreSQL database, create one on Render (or Supabase / Neon) and supply its connection string in `DATABASE_URL`. If `DATABASE_URL` is omitted, it operates on built-in SQLite automatically.

---

### 5.3 Side 3: Android Mobile App (.apk) via GitHub Actions (Zero Local Tools Needed)
Build and download the Android customer mobile app `.apk` directly in the cloud using GitHub Actions. You **do not** need Flutter, Java JDK, Android Studio, or Android SDKs installed on your local computer.

#### How to Trigger Build and Download APK:
1. Push your code to GitHub on the `main` branch.
2. In your GitHub repository, click on the **Actions** tab at the top.
3. In the left sidebar, select the workflow: **Build Android APK**.
4. Click the **Run workflow** dropdown button on the right:
   - **Backend API Base URL**: Enter your Render backend URL (e.g., `https://datacore-backend.onrender.com`).
   - **Publish as a downloadable GitHub Release**: Check `true` (default).
5. Click the green **Run workflow** button.
6. GitHub will launch an Ubuntu runner that:
   - Sets up JDK 17 & Flutter stable.
   - Generates the Android platform scaffolding with internet permissions.
   - Compiles the release binary with your Render backend URL injected.
   - Packages `app-release.apk`.
7. **Download the APK**:
   - **From Workflow Artifacts**: Click the completed workflow run. Scroll down to the **Artifacts** section at the bottom of the page and click `datacore-customer-app-release-apk` to download the zip file containing the `.apk`.
   - **From GitHub Releases**: Go to the **Releases** section on the main page of your repository. Under the generated release, download `app-release.apk` directly to install on any Android phone.

---

## 6. Verification & Acceptance Invariants

| Invariant | Implementation Mechanism | Verification Test |
| :--- | :--- | :--- |
| **Balance Conservation** | Double-entry ledger (`Sum(Debits) == Sum(Credits)`) | `test_successful_transfer_and_ledger_double_entry` |
| **No Negative Balances** | `SELECT FOR UPDATE` & conditional version updates | `test_pessimistic_locking_race_experiment` |
| **Duplicate Suppression** | SHA-256 payload hash with `Idempotency-Key` | `test_idempotency_key_duplicate_prevention` |
| **Tampered Key Rejection** | Fingerprint mismatch validation | `test_idempotency_key_reuse_different_payload_rejected` |
| **RBAC Authorization** | Server-side role checks on every API route | `test_normal_user_cannot_access_admin_api` |
