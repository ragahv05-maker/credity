#!/usr/bin/env bash
set -euo pipefail

: "${GATEWAY_URL:?missing}"
: "${ISSUER_URL:?missing}"
: "${WALLET_URL:?missing}"
: "${RECRUITER_URL:?missing}"

curl -fsS "$GATEWAY_URL/api/health" | jq -e '.status=="ok" and .app=="credverse-gateway"' >/dev/null
curl -fsS "$ISSUER_URL/api/health" | jq -e '.status=="ok" and .app=="issuer" and (.blockchain|type=="object")' >/dev/null
curl -fsS "$ISSUER_URL/api/health/relayer" | jq -e '.ok==true and .configured==true and (.missingEnvVars|length==0)' >/dev/null
curl -fsS "$WALLET_URL/api/health" | jq -e '.status=="ok"' >/dev/null
curl -fsS "$RECRUITER_URL/api/health" | jq -e '.status=="ok" and .app=="recruiter" and (.blockchain|type=="object")' >/dev/null

echo "Infra live smoke: PASS"
