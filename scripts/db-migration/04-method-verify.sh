#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

load_env
require_var SRC_DB_URL
require_var TGT_DB_URL

VERIFY_METHOD="${VERIFY_METHOD:-fast}"  # fast|exact
ROWCOUNT_TOLERANCE="${ROWCOUNT_TOLERANCE:-0}"
OUT_DIR="${OUT_DIR:-$ROOT_DIR/scripts/db-migration/artifacts/verify}"
TS="$(date +%Y%m%d-%H%M%S)"
SRC_FILE="$OUT_DIR/src-method-$VERIFY_METHOD-$TS.txt"
TGT_FILE="$OUT_DIR/tgt-method-$VERIFY_METHOD-$TS.txt"
DIFF_FILE="$OUT_DIR/method-diff-$VERIFY_METHOD-$TS.patch"
STATE_FILE="$OUT_DIR/state-store-gate-$TS.txt"

ensure_dir "$OUT_DIR"

collect_fast() {
  local db_url="$1"
  psql "$db_url" -v ON_ERROR_STOP=1 -Atc "
    SELECT schemaname || '.' || relname || '|' || COALESCE(n_live_tup,0)::bigint
    FROM pg_stat_user_tables
    ORDER BY 1;"
}

collect_exact() {
  local db_url="$1"
  psql "$db_url" -v ON_ERROR_STOP=1 -Atc "
WITH q AS (
  SELECT format(
    'SELECT %L || ''|'' || count(*)::bigint FROM %I.%I',
    table_schema || '.' || table_name,
    table_schema,
    table_name
  ) AS sql
  FROM information_schema.tables
  WHERE table_type='BASE TABLE'
    AND table_schema NOT IN ('pg_catalog','information_schema')
  ORDER BY table_schema, table_name
)
SELECT string_agg(sql, E';\n') FROM q;" | psql "$db_url" -v ON_ERROR_STOP=1 -At
}

log "Method verification: $VERIFY_METHOD"
if [[ "$VERIFY_METHOD" == "fast" ]]; then
  collect_fast "$SRC_DB_URL" > "$SRC_FILE"
  collect_fast "$TGT_DB_URL" > "$TGT_FILE"
elif [[ "$VERIFY_METHOD" == "exact" ]]; then
  collect_exact "$SRC_DB_URL" > "$SRC_FILE"
  collect_exact "$TGT_DB_URL" > "$TGT_FILE"
else
  fail "VERIFY_METHOD must be fast or exact"
fi

log "Comparing source vs target rowcounts"
if command -v diff >/dev/null 2>&1; then
  diff -u "$SRC_FILE" "$TGT_FILE" > "$DIFF_FILE" || true
fi

# Hard gate: exact line-by-line match when tolerance is 0
if [[ "$ROWCOUNT_TOLERANCE" == "0" ]]; then
  if ! cmp -s "$SRC_FILE" "$TGT_FILE"; then
    fail "Rowcount verification failed (tolerance=0). See $DIFF_FILE"
  fi
fi

log "Checking required credverse_state_store service keys on target"
psql "$TGT_DB_URL" -v ON_ERROR_STOP=1 -At <<'SQL' > "$STATE_FILE"
WITH expected(service_key) AS (
  VALUES
    ('wallet-storage'),
    ('issuer-storage'),
    ('recruiter-storage'),
    ('issuer-queue-runtime'),
    ('issuer-status-list'),
    ('issuer-anchor-batches'),
    ('issuer-compliance'),
    ('issuer-oid4vci-runtime'),
    ('issuer-digilocker-user-pull-state'),
    ('recruiter-compliance'),
    ('recruiter-oid4vp-requests'),
    ('recruiter-verification-engine')
)
SELECT e.service_key || '|' || CASE WHEN s.service_key IS NULL THEN 'MISSING' ELSE 'PRESENT' END
FROM expected e
LEFT JOIN credverse_state_store s USING (service_key)
ORDER BY e.service_key;
SQL

if grep -q 'MISSING' "$STATE_FILE"; then
  fail "State-store verification failed: missing required service keys. See $STATE_FILE"
fi

cat <<DONE
Method verification passed.
Artifacts:
- $SRC_FILE
- $TGT_FILE
- $DIFF_FILE
- $STATE_FILE
DONE
