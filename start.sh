#!/bin/sh
set -e
echo "[start] PWD=$(pwd)"
echo "[start] Checking backend..."
if [ -d "backend" ]; then
  ls -la backend/
  echo "[start] Starting from project root..."
  exec node backend/server.js
elif [ -d "/app/backend" ]; then
  echo "[start] Starting from /app/backend..."
  cd /app/backend && exec node server.js
else
  echo "[start] ERROR: backend not found"
  ls -la
  exit 1
fi
