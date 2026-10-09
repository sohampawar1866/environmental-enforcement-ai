#!/bin/sh
set -e

# ==============================================================================
# CIVICCLEAN · CONTAINER ENTRYPOINT FOR AWS APP RUNNER / ECS
# ==============================================================================

echo "========================================================"
echo "Starting CivicClean Municipal Enforcement Cluster (AWS)"
echo "Port: ${PORT:-8000}"
echo "========================================================"

# Launch FastAPI backend on internal port 8001
echo "[1/2] Starting FastAPI Video Processing Engine on 127.0.0.1:8001..."
PYTHONPATH=backend python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8001 &
BACKEND_PID=$!

# Launch Frontend & Better-Auth Gateway on public port (defaults to 8000 for App Runner)
echo "[2/2] Starting Frontend & Better-Auth Gateway on 0.0.0.0:${PORT:-8000}..."
cd frontend
export VITE_PORT="${PORT:-8000}"
export PORT="${PORT:-8000}"
export VITE_BACKEND_URL="http://127.0.0.1:8001"
export BACKEND_URL="http://127.0.0.1:8001"

npm run dev -- --host 0.0.0.0 --port "${PORT:-8000}" &
FRONTEND_PID=$!

# Handle shutdown signals gracefully
trap "kill -TERM $BACKEND_PID $FRONTEND_PID 2>/dev/null" SIGINT SIGTERM

wait -n $BACKEND_PID $FRONTEND_PID
