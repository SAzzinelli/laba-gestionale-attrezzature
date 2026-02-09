#!/bin/sh
set -e
echo "=== Container starting ==="
echo "PORT=${PORT:-not set}"
echo "DATABASE_URL: $(test -n "$DATABASE_URL" && echo 'set' || echo 'NOT SET - add in Railway Variables')"
if [ -z "$DATABASE_URL" ]; then
  echo "Fatal: DATABASE_URL required. Add it in Railway: Project → Variables"
  exit 1
fi
exec node backend/server.js
