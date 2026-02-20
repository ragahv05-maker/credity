#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

load_env
require_var TGT_DB_URL

log "Applying baseline SQL to target (direct connection)"
psql "$TGT_DB_URL" -v ON_ERROR_STOP=1 -f "$SCRIPT_DIR/sql/001_extensions.sql"
psql "$TGT_DB_URL" -v ON_ERROR_STOP=1 -f "$SCRIPT_DIR/sql/010_ensure_state_store.sql"

cat <<NEXT

Next steps (from runbook):
1) Run Drizzle migrations for wallet/issuer/recruiter using DATABASE_URL_DIRECT.
2) Then run 02-backfill.sh for initial data load.

NEXT

log "Schema baseline complete"
