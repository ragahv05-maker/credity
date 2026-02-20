#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

STAGE="${1:-all}"  # preflight|schema|backfill|verify|gate|all

run_stage() {
  local name="$1"
  local cmd="$2"
  echo
  echo "==== Running stage: $name ===="
  eval "$cmd"
}

case "$STAGE" in
  preflight)
    run_stage preflight "$SCRIPT_DIR/00-preflight.sh"
    ;;
  schema)
    run_stage schema "$SCRIPT_DIR/01-schema-baseline.sh"
    ;;
  backfill)
    run_stage backfill "$SCRIPT_DIR/02-backfill.sh"
    ;;
  verify)
    run_stage verify "$SCRIPT_DIR/03-verify.sh"
    ;;
  gate)
    run_stage gate "$SCRIPT_DIR/04-method-verify.sh"
    ;;
  all)
    run_stage preflight "$SCRIPT_DIR/00-preflight.sh"
    run_stage schema "$SCRIPT_DIR/01-schema-baseline.sh"
    run_stage backfill "$SCRIPT_DIR/02-backfill.sh"
    run_stage verify "$SCRIPT_DIR/03-verify.sh"
    run_stage gate "$SCRIPT_DIR/04-method-verify.sh"
    ;;
  *)
    echo "Usage: $0 [preflight|schema|backfill|verify|gate|all]"
    exit 1
    ;;
esac

echo
printf "Staged workflow complete: %s\n" "$STAGE"
