# CREDITY 24H SPRINT — PHOENIX Lane

## Deployment Execution Package (Railway/Vercel split)

Prepared from:

- `DEPLOYMENT.md`
- `.env.launch.example`
- `scripts/launch-gate-check.mjs`

Date: 2026-02-18

---

## 1) Launch-gate assumption validation

### ✅ Validated now

- `npm run gate:launch:strict` executes successfully when env vars are loaded from `.env.launch.example` placeholders.
- Required launch docs/runbooks referenced by launch gate are present:
  - `docs/runbooks/incident-response.md`
  - `docs/runbooks/rollback.md`
  - `docs/gates/production-launch-gate.md`
  - `docs/compliance/launch-evidence-template.md`
- Permanent hosting blueprint exists in `DEPLOYMENT.md` for:
  - **Vercel**: `credverse-gateway`
  - **Railway**: `CredVerseIssuer 3`, `BlockWalletDigi`, `CredVerseRecruiter`

### ⚠️ Assumption gaps to close before GO

- **Gate coverage gap**: strict gate currently enforces only:
  - `JWT_SECRET`, `JWT_REFRESH_SECRET`, `REDIS_URL`, and one of `SENTRY_DSN|GATEWAY_SENTRY_DSN`
- But production launch docs also require issuer-chain critical vars not hard-enforced by strict gate:
  - `ISSUER_KEY_ENCRYPTION`
  - `RELAYER_PRIVATE_KEY`
  - `REGISTRY_CONTRACT_ADDRESS`
  - `SEPOLIA_RPC_URL` (or equivalent chain RPC for target network)
  - `DATABASE_URL` (if production persistence is required)
- **Platform ambiguity in DEPLOYMENT.md**: an older section still describes deploying gateway on Railway, while permanent blueprint recommends gateway on Vercel. For Phoenix cutover, follow the split blueprint only.

---

## 2) Environment variable completeness check (from `.env.launch.example`)

### A. Strict launch-gate required (must be present)

- [ ] `JWT_SECRET`
- [ ] `JWT_REFRESH_SECRET`
- [ ] `REDIS_URL`
- [ ] `SENTRY_DSN` or `GATEWAY_SENTRY_DSN`

### B. Runtime hardening baseline (must be present for prod)

- [ ] `NODE_ENV=production`
- [ ] `ALLOW_DEMO_ROUTES=false`
- [ ] `REQUIRE_DATABASE=true`
- [ ] `REQUIRE_QUEUE=true`
- [ ] `ALLOWED_ORIGINS` (all production domains)
- [ ] `DATABASE_URL`

### C. Issuer crypto + chain safety (must be present for on-chain write path)

- [ ] `ISSUER_KEY_ENCRYPTION`
- [ ] `RELAYER_PRIVATE_KEY`
- [ ] `CHAIN_NETWORK`
- [ ] `SEPOLIA_RPC_URL` (or target chain RPC)
- [ ] `REGISTRY_CONTRACT_ADDRESS`
- [ ] (optional rotation) `ISSUER_KEY_ENCRYPTION_PREVIOUS`

### D. Optional but expected by feature toggles

- Reputation graph (Neo4j):
  - [ ] `REPUTATION_GRAPH_ENABLED`
  - [ ] `REPUTATION_GRAPH_URI`
  - [ ] `REPUTATION_GRAPH_USERNAME`
  - [ ] `REPUTATION_GRAPH_PASSWORD`
  - [ ] `REPUTATION_GRAPH_DATABASE`
- Wallet trust-sdk bridge:
  - [ ] `REPUTATION_TRUST_SDK_ENABLED`
  - [ ] `TRUST_SDK_BASE_URL`
  - [ ] `TRUST_SDK_API_KEY` (if required upstream)
  - [ ] `TRUST_SDK_TIMEOUT_MS`
- Gateway OAuth:
  - [ ] `GOOGLE_CLIENT_ID`
  - [ ] `GOOGLE_CLIENT_SECRET`
  - [ ] `GOOGLE_REDIRECT_URI`

---

## 3) One-command runbooks (operator-safe, no secrets in repo)

> Use a local non-committed env file (e.g. `.env.launch.local`) with real values.

### 3.1 Global pre-cutover launch gate (single command)

```bash
cd /Users/raghav/Desktop/credity && set -a; source .env.launch.local; set +a; npm run gate:launch:strict && npm run gate:contracts:security && npm run check && npm test
```

### 3.2 Railway lane preflight (Issuer/Wallet/Recruiter) (single command)

```bash
cd /Users/raghav/Desktop/credity && set -a; source .env.launch.local; set +a; \
for svc in "CredVerseIssuer 3" "BlockWalletDigi" "CredVerseRecruiter"; do \
  echo "== $svc =="; (cd "$svc" && npm run build); \
done
```

### 3.3 Vercel lane preflight (Gateway) (single command)

```bash
cd /Users/raghav/Desktop/credity/credverse-gateway && npm run build
```

### 3.4 Post-cutover health sweep (single command)

```bash
ISSUER_URL="https://issuer.<domain>" WALLET_URL="https://wallet.<domain>" RECRUITER_URL="https://recruiter.<domain>" GATEWAY_URL="https://gateway.<domain>" \
bash -lc 'for u in "$ISSUER_URL" "$WALLET_URL" "$RECRUITER_URL" "$GATEWAY_URL"; do echo "== $u"; curl -fsS "$u/api/health" || exit 1; echo; done'
```

### 3.5 Hosted CI evidence pack (single command)

```bash
cd /Users/raghav/Desktop/credity && npm run ci:evidence:pack -- --sha=<release_sha> --ref=<release_ref> --qualityRun=<url> --contractRun=<url> --launchRun=<url> --out=swarm/reports/ci-evidence-pack.latest.md
```

---

## 4) Operator-ready 24h cutover checklist

## T-24h to T-12h (freeze + secret readiness)

- [ ] Confirm release SHA/tag and change freeze window.
- [ ] Populate Vercel + Railway envs from secret manager (not from git files).
- [ ] Confirm mandatory variables in sections A+B+C above are all set.
- [ ] Confirm `REGISTRY_CONTRACT_ADDRESS` points to approved active contract.
- [ ] Run global pre-cutover command (3.1) and store logs.

## T-12h to T-6h (platform preflight)

- [ ] Run Railway lane preflight command (3.2).
- [ ] Run Vercel lane preflight command (3.3).
- [ ] Validate CORS/`ALLOWED_ORIGINS` match final domains.
- [ ] Validate OAuth redirect URI matches gateway domain.

## T-6h to T-2h (canary + observability)

- [ ] Deploy to production targets (Railway APIs + Vercel gateway).
- [ ] Run post-cutover health sweep (3.4).
- [ ] Check Sentry ingest events visible for all services.
- [ ] Verify no Sev-1/Sev-2 incidents open.

## T-2h to T-0h (GO/NO-GO board)

- [ ] Confirm hosted workflows are green: quality, contracts, launch gate.
- [ ] Generate CI evidence pack command (3.5).
- [ ] Attach evidence to release board + compliance template.
- [ ] Security + Release owner sign-off.
- [ ] Declare GO if all pass; otherwise NO-GO and invoke rollback runbook.

## T+0h to T+24h (hypercare)

- [ ] Monitor `/api/health`, 5xx rate, p95 latency, queue depth, and error spikes.
- [ ] Keep rollback command and previous version IDs ready.
- [ ] Log incidents/events in launch evidence pack.
- [ ] Final 24h launch review and closure note.

---

## 5) Phoenix decision rule

**GO only if all are true:**

1. Strict launch gate + contracts security + checks/tests pass on release SHA.
2. Railway/Vercel services healthy on production domains.
3. Hosted CI evidence artifacts attached for quality/contract/launch workflows.
4. Mandatory secret inventory complete (including issuer-chain keys/addresses).
5. Release + Security sign-off recorded.

Otherwise: **NO-GO** and execute rollback runbook.
