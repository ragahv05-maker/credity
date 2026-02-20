#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

log "Preflight: Supabase migration scaffolding"
require_cmd psql
require_cmd pg_dump
require_cmd pg_restore
require_cmd node

load_env

require_var SRC_DB_URL
require_var TGT_DB_URL
require_var DATABASE_URL
require_var DATABASE_URL_DIRECT
require_var REQUIRE_DATABASE

if [[ "$REQUIRE_DATABASE" != "true" ]]; then
  warn "REQUIRE_DATABASE is '$REQUIRE_DATABASE' (expected true for migration safety)."
else
  log "REQUIRE_DATABASE=true confirmed"
fi

log "Running existing repo safety check"
node "$ROOT_DIR/scripts/db-migration-safety-check.mjs"

log "Connectivity checks (\"SELECT 1\")"
psql "$SRC_DB_URL" -c 'SELECT 1 as src_ok;'
psql "$TGT_DB_URL" -c 'SELECT 1 as tgt_ok;'

cat <<CHECKLIST

Checklist snapshot (manual):
- [ ] Freeze schema/code changes for migration window
- [x] Confirm source/target DB env vars and access
- [ ] Confirm Supabase project provisioned (prod/staging)
- [ ] Backup source DB (next: 02-backfill.sh)

CHECKLIST

log "Preflight complete"
