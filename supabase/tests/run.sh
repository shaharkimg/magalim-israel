#!/usr/bin/env bash
# Replays every real migration on a vanilla Postgres (with a minimal Supabase stub) and runs the
# SQL security tests. Needs a reachable Postgres: PGHOST/PGPORT/PGUSER (superuser) in the env.
#   PGHOST=/tmp/pgsock PGPORT=54329 PGUSER=pgtest bash supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")/.."
DB="${TEST_DB:-magalim_test}"
psql -q -d postgres -c "drop database if exists $DB" -c "create database $DB" >/dev/null
P="psql -q -d $DB -v ON_ERROR_STOP=1"
# roles are cluster-wide, so tolerate "already exists" on reruns
psql -q -d "$DB" -f tests/stub_supabase.sql 2>&1 | grep -v "already exists" || true

while read -r f; do
  [ -z "$f" ] && continue
  case "$f" in
    migrations_hardening_*) continue ;;   # applied explicitly, in the documented order
  esac
  $P -1 -f "$f" >/dev/null
done < tests/migration_order.txt

run_test() {
  local out status
  out=$($P -f "$1" 2>&1) && status=0 || status=$?
  echo "$out" | grep -E "PASS|FAIL|ERROR" | sed 's/^psql:[^ ]* //; s/^NOTICE: *//'
  return $status
}

echo "== phase A: hardening 1 (RPCs + guards)"
$P -1 -f migrations_hardening_1_rpcs.sql >/dev/null
$P -1 -f migrations_hardening_1_rpcs.sql >/dev/null   # must be re-runnable
run_test tests/test_hardening_a.sql

echo "== phase B: lockdown"
$P -1 -f migrations_hardening_2_lockdown.sql >/dev/null
$P -1 -f migrations_hardening_2_lockdown.sql >/dev/null   # must be re-runnable
run_test tests/test_hardening_b.sql
echo "SQL tests finished"
