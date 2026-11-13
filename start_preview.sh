#!/usr/bin/env bash
set -e

REPO_DIR="/data/data/com.termux/files/home/Data-Concurrency-RealTime-Transaction-Engine"
VENV_DIR="/data/data/com.termux/files/home/venv"

echo "=================================================="
echo " Starting DataCore Enterprise Preview in Termux"
echo "=================================================="

# 1. Activate Python virtual environment & migrate/seed
source "$VENV_DIR/bin/activate"
cd "$REPO_DIR/backend"

echo "[1/3] Ensuring backend database is migrated & seeded..."
python manage.py migrate --noinput
python manage.py setup_datacore

# 2. Launch Django API server in background
echo "[2/3] Launching Django DRF backend on http://127.0.0.1:8000..."
python manage.py runserver 127.0.0.1:8000 &
BACKEND_PID=$!

# Function to kill both on exit
cleanup() {
    echo ""
    echo "Stopping DataCore preview services..."
    kill $BACKEND_PID 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 3. Launch Vite Frontend Dev Server
cd "$REPO_DIR/admin-dashboard"
echo "[3/3] Launching Vite Frontend on http://localhost:5173..."
echo ""
echo "Open in your Android browser: http://localhost:5173"
echo "Login Credentials:"
echo "  Email:    admin@datacore.io"
echo "  Password: adminpassword123"
echo ""
echo "Press Ctrl+C to stop both servers."
echo "=================================================="

npm run dev -- --host 0.0.0.0
