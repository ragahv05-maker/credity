#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE_DEFAULT="$ROOT_DIR/scripts/db-migration/env/.env.db-migration.local"

log() { printf "[%s] %s\n" "$(date +"%Y-%m-%d %H:%M:%S")" "$*"; }
warn() { printf "[%s] WARN: %s\n" "$(date +"%Y-%m-%d %H:%M:%S")" "$*" >&2; }
fail() { printf "[%s] ERROR: %s\n" "$(date +"%Y-%m-%d %H:%M:%S")" "$*" >&2; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

load_env() {
  local env_file="${ENV_FILE:-$ENV_FILE_DEFAULT}"
  [[ -f "$env_file" ]] || fail "Env file not found: $env_file"
  # shellcheck disable=SC1090
  set -a; source "$env_file"; set +a
  log "Loaded env from $env_file"
}

require_var() {
  local n="$1"
  [[ -n "${!n:-}" ]] || fail "Required env var missing: $n"
}

ensure_dir() {
  mkdir -p "$1"
}
