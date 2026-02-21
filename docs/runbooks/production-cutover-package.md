# Production Cutover Package (Railway + Vercel)

Date: 2026-02-18
Scope: CredVerse Issuer, BlockWallet, Recruiter (Railway) + Gateway (Vercel)

## 1) Launch Gate Validation Summary (no secrets used)

Validated from repository state and strict gate script behavior:

- ✅ `docs/runbooks/incident-response.md` present
- ✅ `docs/runbooks/rollback.md` present
- ✅ `docs/gates/production-launch-gate.md` present
- ✅ `docs/compliance/launch-evidence-template.md` present
- ✅ `.env.launch.example` includes strict and launch-hardening keys
- ✅ `npm run gate:launch:strict` passes with non-secret dummy env values

Command executed (safe placeholders only):

```bash
LAUNCH_GATE_STRICT=1 \
JWT_SECRET=dummy \
JWT_REFRESH_SECRET=dummy \
REDIS_URL=redis://example \
SENTRY_DSN=https://example.invalid/1 \
npm run gate:launch:strict
```

Result: **Launch gate checks passed**.

---

## 2) Secret Inventory to Set in Providers (do not commit)

Set in provider env UIs / secret managers only.

### Shared (all production services)

- `NODE_ENV=production`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `ALLOWED_ORIGINS`
- `REDIS_URL`
- `SENTRY_DSN` (or `GATEWAY_SENTRY_DSN` for gateway)

### Hardening flags (must be enforced)

- `ALLOW_DEMO_ROUTES=false`
- `REQUIRE_DATABASE=true`
- `REQUIRE_QUEUE=true`

### API data persistence

- `DATABASE_URL` (PostgreSQL)

### Issuer required

- `ISSUER_KEY_ENCRYPTION`
- `RELAYER_PRIVATE_KEY`
- `REGISTRY_CONTRACT_ADDRESS`
- `CHAIN_NETWORK` (recommended: `ethereum-sepolia` for pilot)
- `SEPOLIA_RPC_URL`

### Gateway OAuth

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`

Current approved Sepolia registry from `DEPLOYMENT.md`:

- `0x6060250FC92538571adde5c66803F8Cbe77145a1`

---

## 3) Exact Cutover Runbook

## Phase A — Pre-cutover freeze (T-30 to T-10 min)

1. Freeze merges to `main` (or release branch lock).
2. Confirm provider health (Railway/Vercel status pages).
3. Confirm all secrets entered in Railway/Vercel UIs.
4. Confirm DNS TTL lowered for affected records (if changing domains).
5. Confirm incident + rollback owners on-call.

Go/No-Go precheck commands:

```bash
cd /Users/raghav/Desktop/credity
npm run gate:launch:strict
npm run gate:contracts:security
```

(Use local non-committed env injection when running strict gates.)

## Phase B — Deploy services

### B1) Railway deploys

Create/update 3 services with these root directories:

- `CredVerseIssuer 3`
- `BlockWalletDigi`
- `CredVerseRecruiter`

For each service in Railway:

1. Confirm GitHub repo is linked to `raghavbadhwar/credity`.
2. Confirm Root Directory matches service.
3. Set environment variables.
4. Trigger deploy of target commit/tag.
5. Wait for successful build + start.

### B2) Vercel deploy (Gateway)

Project root:

- `credverse-gateway`

In Vercel:

1. Confirm Production env vars are set.
2. Trigger production deploy for same commit/tag as Railway rollout.
3. Confirm deployment marked Ready.

## Phase C — DNS and traffic cutover

1. Ensure custom domains map to new Railway/Vercel endpoints.
2. Validate TLS certificates issued and active.
3. Switch traffic (if using staged/blue-green DNS strategy).
4. Monitor 5xx, latency, and auth errors for 15–30 minutes.

---

## 4) Post-deploy Verification (exact checks)

Replace hostnames before running:

```bash
export ISSUER_URL="https://issuer.<domain>"
export WALLET_URL="https://wallet.<domain>"
export RECRUITER_URL="https://recruiter.<domain>"
export GATEWAY_URL="https://gateway.<domain>"
```

### 4.1 Health endpoints

```bash
curl -fsS "$ISSUER_URL/api/health"
curl -fsS "$WALLET_URL/api/health"
curl -fsS "$RECRUITER_URL/api/health"
curl -fsS "$GATEWAY_URL/api/health"
```

Expected: JSON status OK for each service.

### 4.2 Security headers quick check

```bash
curl -I "$ISSUER_URL" | egrep -i "strict-transport-security|x-content-type-options|x-frame-options|content-security-policy"
```

### 4.3 CORS allowlist sanity

```bash
curl -i -X OPTIONS "$ISSUER_URL/api/health" \
  -H "Origin: $GATEWAY_URL" \
  -H "Access-Control-Request-Method: GET"
```

Expected: allow-origin only for approved domains.

### 4.4 Strict gate replay (runtime config validation)

```bash
cd /Users/raghav/Desktop/credity
set -a; source .env.launch.local; set +a
npm run gate:launch:strict
```

### 4.5 Observability smoke

- Trigger one controlled non-sensitive error path in each app and confirm event in Sentry.
- Verify no secrets appear in logs.

### 4.6 Functional smoke (minimum)

- Gateway login page loads.
- OAuth redirect URI resolves correctly.
- Issuer dashboard loads authenticated session.
- Wallet can fetch credentials list.
- Recruiter verification flow reaches success page for known valid sample.

---

## 5) Rollback Plan (if any Sev-1/Sev-2)

Trigger rollback if any of:

- Health endpoint failing for any core service >5 minutes
- Auth outage / token issuance failures
- 5xx error rate exceeds threshold and sustained

Rollback actions:

1. Railway: rollback each affected service to last known good deployment.
2. Vercel: promote previous stable deployment to production.
3. Re-verify health endpoints and critical user journeys.
4. Open incident and attach timeline/evidence.

---

## 6) Evidence to Archive in Launch Ticket

- Gate outputs (`gate:launch:strict`, `gate:contracts:security`)
- Railway deploy IDs per service
- Vercel deployment URL/ID
- Health check output snapshots
- Sentry smoke-test confirmation
- Final Go/No-Go approval notes
