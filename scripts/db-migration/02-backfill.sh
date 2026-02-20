#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

load_env
require_var SRC_DB_URL
require_var TGT_DB_URL

BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/scripts/db-migration/artifacts}"
DUMP_FILE="$BACKUP_DIR/credity-full.dump"
MODE="${MODE:-run}" # run|dry-run

ensure_dir "$BACKUP_DIR"

log "Backfill mode: $MODE"
log "Dump file: $DUMP_FILE"

if [[ "$MODE" == "dry-run" ]]; then
  log "DRY-RUN: would execute pg_dump from source and pg_restore to target"
  exit 0
fi

log "Creating source backup via pg_dump"
pg_dump "$SRC_DB_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file "$DUMP_FILE"

log "Restoring backup to target via pg_restore"
pg_restore \
  --no-owner \
  --no-privileges \
  --verbose \
  --dbname "$TGT_DB_URL" \
  "$DUMP_FILE"

log "Backfill completed"
