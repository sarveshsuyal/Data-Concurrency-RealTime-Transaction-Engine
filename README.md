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

## 5. Deployment Guide

### Backend & PostgreSQL on Render
1. Push this repository to GitHub.
2. In Render, select **Blueprints** and connect your repository pointing to `render.yaml`.
3. Render automatically provisions:
   - One managed PostgreSQL database.
   - One Django Web Service with automated migrations and Gunicorn execution.

### Admin Dashboard on Vercel
1. Import the repository into Vercel.
2. Set Root Directory to `admin-dashboard`.
3. Framework Preset: **Vite**.
4. Set Environment Variable:
   - `VITE_API_BASE_URL`: `https://your-render-backend.onrender.com`
5. Deploy.

---

## 6. Verification & Acceptance Invariants

| Invariant | Implementation Mechanism | Verification Test |
| :--- | :--- | :--- |
| **Balance Conservation** | Double-entry ledger (`Sum(Debits) == Sum(Credits)`) | `test_successful_transfer_and_ledger_double_entry` |
| **No Negative Balances** | `SELECT FOR UPDATE` & conditional version updates | `test_pessimistic_locking_race_experiment` |
| **Duplicate Suppression** | SHA-256 payload hash with `Idempotency-Key` | `test_idempotency_key_duplicate_prevention` |
| **Tampered Key Rejection** | Fingerprint mismatch validation | `test_idempotency_key_reuse_different_payload_rejected` |
| **RBAC Authorization** | Server-side role checks on every API route | `test_normal_user_cannot_access_admin_api` |
