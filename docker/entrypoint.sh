#!/bin/sh
set -e
cd /app
# Railway Postgres (and other plugins) inject postgres DATABASE_URL; this app uses SQLite only.
# Prefer SQLITE_DATABASE_URL, else keep DATABASE_URL only when it is a file: URL, else default.
if [ -n "${SQLITE_DATABASE_URL:-}" ]; then
  export DATABASE_URL="$SQLITE_DATABASE_URL"
else
  case "${DATABASE_URL:-}" in
    file:*)
      ;;
    *)
      export DATABASE_URL="file:/data/prod.db"
      ;;
  esac
fi
mkdir -p /data
npx prisma migrate deploy
exec npx next start -H 0.0.0.0 -p "${PORT:-3000}"
