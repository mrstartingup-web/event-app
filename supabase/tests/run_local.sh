#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Apply the schema and the RLS checks to a THROWAWAY local PostgreSQL.
#
# Proves supabase/migrations/0001_init.sql, supabase/seed.sql and
# supabase/tests/rls_check.sql really run, without touching the owner's
# Supabase project. Requires a running PostgreSQL 15+ with psql/createdb.
#
# Usage:
#   PGHOST=127.0.0.1 PGPORT=5432 PGUSER=postgres ./supabase/tests/run_local.sh [dbname]
#   DATABASE_URL=postgresql://postgres@127.0.0.1:5432/postgres ./supabase/tests/run_local.sh
#
# The scratch database (default bna_sql_test) is dropped and recreated on every
# run. It is left in place afterwards for inspection; drop it yourself when done.
# ---------------------------------------------------------------------------
set -euo pipefail
cd "$(dirname "$0")/../.."

DB="${1:-bna_sql_test}"

if [[ -n "${DATABASE_URL:-}" ]]; then
  MAINT_URL="${DATABASE_URL%/*}/postgres"
  DB_URL="${DATABASE_URL%/*}/$DB"
elif [[ -n "${BASE_URL:-}" ]]; then
  MAINT_URL="${BASE_URL%/}/postgres"
  DB_URL="${BASE_URL%/}/$DB"
elif [[ -n "${SUPABASE_DB_URL:-}" ]]; then
  MAINT_URL="${SUPABASE_DB_URL%/*}/postgres"
  DB_URL="${SUPABASE_DB_URL%/*}/$DB"
else
  : "${PGHOST:?set PGHOST/PGPORT/PGUSER, or DATABASE_URL, or BASE_URL}"
  MAINT_URL="dbname=postgres"
  DB_URL="dbname=$DB"
fi

echo "== dropping and recreating the scratch database '$DB'"
psql "$MAINT_URL" -v ON_ERROR_STOP=1 -q -c "drop database if exists \"$DB\""
psql "$MAINT_URL" -v ON_ERROR_STOP=1 -q -c "create database \"$DB\""

echo "== 1/4  Supabase stubs (auth/storage schemas, roles) — TEST ONLY"
psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f supabase/tests/local_stub_supabase.sql

echo "== 2/4  migration 0001_init.sql"
psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f supabase/migrations/0001_init.sql

echo "== 3/4  seed.sql (sample content)"
psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f supabase/seed.sql

echo "== 4/4  RLS checks"
psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_check.sql

echo
echo "ALL SQL APPLIED AND EVERY RLS CHECK PASSED ($DB left in place for inspection)"
echo "drop it with:  psql \"$MAINT_URL\" -c 'drop database $DB'"
