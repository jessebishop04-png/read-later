#!/bin/sh
set -e
cd /app
export DATABASE_URL="${DATABASE_URL:-file:/data/prod.db}"
mkdir -p /data
npx prisma migrate deploy
exec npx next start -H 0.0.0.0 -p "${PORT:-3000}"
