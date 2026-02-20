#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

load_env
require_var SRC_DB_URL
require_var TGT_DB_URL

OUT_DIR="${OUT_DIR:-$ROOT_DIR/scripts/db-migration/artifacts/verify}"
ensure_dir "$OUT_DIR"
TS="$(date +%Y%m%d-%H%M%S)"

log "Running source rowcount snapshot"
psql "$SRC_DB_URL" -v ON_ERROR_STOP=1 -f "$SCRIPT_DIR/sql/100_verify_rowcounts.sql" > "$OUT_DIR/src-rowcounts-$TS.txt"

log "Running target rowcount snapshot"
psql "$TGT_DB_URL" -v ON_ERROR_STOP=1 -f "$SCRIPT_DIR/sql/100_verify_rowcounts.sql" > "$OUT_DIR/tgt-rowcounts-$TS.txt"

log "Checking target state-store entries"
psql "$TGT_DB_URL" -v ON_ERROR_STOP=1 -f "$SCRIPT_DIR/sql/101_verify_state_store.sql" > "$OUT_DIR/tgt-state-store-$TS.txt"

log "Generating diff (rowcounts)"
if command -v diff >/dev/null 2>&1; then
  diff -u "$OUT_DIR/src-rowcounts-$TS.txt" "$OUT_DIR/tgt-rowcounts-$TS.txt" > "$OUT_DIR/rowcount-diff-$TS.patch" || true
fi

cat <<DONE
Verification outputs:
- $OUT_DIR/src-rowcounts-$TS.txt
- $OUT_DIR/tgt-rowcounts-$TS.txt
- $OUT_DIR/tgt-state-store-$TS.txt
- $OUT_DIR/rowcount-diff-$TS.patch (if diff available)

For key-level checksums, use:
- scripts/db-migration/sql/102_verify_checksums_template.sql
DONE

log "Verification complete"
