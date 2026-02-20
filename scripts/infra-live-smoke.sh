#!/usr/bin/env bash
set -euo pipefail

for bin in curl jq; do
  command -v "$bin" >/dev/null || {
    echo "Missing required tool: $bin" >&2
    exit 1
  }
done

: "${GATEWAY_URL:?missing}"
: "${ISSUER_URL:?missing}"
: "${WALLET_URL:?missing}"
: "${RECRUITER_URL:?missing}"

CURL_OPTS=(--silent --show-error --fail --location --max-time "${SMOKE_TIMEOUT_SECONDS:-15}" --retry "${SMOKE_RETRIES:-2}" --retry-all-errors)

check_json() {
  local label="$1"
  local url="$2"
  local jq_expr="$3"
  echo "[smoke] $label -> $url"
  local payload
  payload="$(curl "${CURL_OPTS[@]}" "$url")"
  jq -e "$jq_expr" <<<"$payload" >/dev/null || {
    echo "[smoke][FAIL] $label validation failed." >&2
    echo "$payload" >&2
    exit 1
  }
}

check_json "gateway health" "$GATEWAY_URL/api/health" '.status=="ok" and .app=="credverse-gateway"'
check_json "issuer health" "$ISSUER_URL/api/health" '.status=="ok" and .app=="issuer" and (.blockchain|type=="object")'
check_json "issuer relayer health" "$ISSUER_URL/api/health/relayer" '.ok==true and .configured==true and (.missingEnvVars|length==0)'
check_json "wallet health" "$WALLET_URL/api/health" '.status=="ok"'
check_json "recruiter health" "$RECRUITER_URL/api/health" '.status=="ok" and .app=="recruiter" and (.blockchain|type=="object")'

echo "Infra live smoke: PASS"
