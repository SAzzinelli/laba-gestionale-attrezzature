#!/bin/sh
set -e
# Debug: sempre visibile nei log Railway
echo "[start] PWD=$(pwd)" 1>&2
echo "[start] LS root:" 1>&2
ls -la / 2>/dev/null | head -20 1>&2
echo "[start] LS /app:" 1>&2
ls -la /app 2>/dev/null | head -20 1>&2 || echo "/app non esiste" 1>&2
if [ -d "/app/backend" ]; then
  echo "[start] Avvio da /app/backend" 1>&2
  cd /app/backend && exec node server.js
elif [ -d "backend" ]; then
  echo "[start] Avvio da backend locale" 1>&2
  exec node backend/server.js
else
  echo "[start] ERRORE: backend non trovato" 1>&2
  exit 1
fi
