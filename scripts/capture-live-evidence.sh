#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   RELEASE_TAG=v1.2.3 OPERATOR="name" \
#   GATEWAY_URL=https://... ISSUER_URL=https://... WALLET_URL=https://... RECRUITER_URL=https://... \
#   bash scripts/capture-live-evidence.sh

for bin in curl jq tee; do
  command -v "$bin" >/dev/null || { echo "Missing required tool: $bin" >&2; exit 1; }
done

: "${RELEASE_TAG:?missing}"
: "${OPERATOR:?missing}"
: "${GATEWAY_URL:?missing}"
: "${ISSUER_URL:?missing}"
: "${WALLET_URL:?missing}"
: "${RECRUITER_URL:?missing}"

TS_UTC="$(date -u +%Y%m%dT%H%M%SZ)"
TS_IST="$(TZ=Asia/Calcutta date +%Y-%m-%dT%H:%M:%S%z)"
OUT_DIR="evidence-pack/live/${RELEASE_TAG}/${TS_UTC}"
mkdir -p "$OUT_DIR"

META_FILE="$OUT_DIR/metadata.txt"
{
  echo "release_tag=$RELEASE_TAG"
  echo "operator=$OPERATOR"
  echo "captured_at_utc=$TS_UTC"
  echo "captured_at_ist=$TS_IST"
  echo "gateway_url=$GATEWAY_URL"
  echo "issuer_url=$ISSUER_URL"
  echo "wallet_url=$WALLET_URL"
  echo "recruiter_url=$RECRUITER_URL"
} > "$META_FILE"

curl_json() {
  local name="$1"
  local url="$2"
  local out="$OUT_DIR/${name}.json"
  echo "[capture] $name -> $url"
  curl --silent --show-error --fail --location --max-time 15 --retry 2 --retry-all-errors "$url" | tee "$out" >/dev/null
}

curl_json "gateway-health" "$GATEWAY_URL/api/health"
curl_json "issuer-health" "$ISSUER_URL/api/health"
curl_json "issuer-relayer-health" "$ISSUER_URL/api/health/relayer"
curl_json "wallet-health" "$WALLET_URL/api/health"
curl_json "recruiter-health" "$RECRUITER_URL/api/health"

# Reuse canonical smoke script and capture exact output.
(
  export GATEWAY_URL ISSUER_URL WALLET_URL RECRUITER_URL
  bash scripts/infra-live-smoke.sh
) | tee "$OUT_DIR/live-smoke.log"

# Optional: capture launch gate strict if env is already loaded by operator.
if [[ "${RUN_LAUNCH_GATE_STRICT:-0}" == "1" ]]; then
  (npm run gate:launch:strict) | tee "$OUT_DIR/gate-launch-strict.log"
fi

echo "[capture] Evidence written to: $OUT_DIR" | tee "$OUT_DIR/README.txt"
