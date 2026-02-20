# Credity12 Infra Live Readiness Audit (Vercel + Railway)

**Timestamp (IST):** 2026-02-20 18:39+  
**Repo audited:** `/Users/raghav/Desktop/credity12`  
**Commit:** `bedb8cd105d9f468d6c16806d47c33cf3ba16289`

## Scope
Production-live readiness audit for:
- `credverse-gateway` (assumed **Vercel**)
- `CredVerseIssuer 3` (assumed **Railway**)
- `BlockWalletDigi` (assumed **Railway**)
- `CredVerseRecruiter` (assumed **Railway**)

This audit is repo/static-config based (no confirmed live URLs were provided), so live endpoint checks are provided as executable validation commands.

---

## 1) Deployment topology readiness (assumption fit)

## ✅ What aligns with Vercel/Railway split
- `credverse-gateway/vercel.json` exists and rewrites `/api/* -> /api/index.js`.
- `railway.toml` exists for all 4 services with:
  - `startCommand = "npm run start"`
  - `healthcheckPath = "/api/health"`
  - `healthcheckTimeout = 100`
- `DEPLOYMENT.md` explicitly recommends:
  - Gateway on Vercel
  - Issuer/Wallet/Recruiter on Railway

## ⚠️ Topology caveat
- Gateway also has `railway.toml`; docs recommend Vercel for gateway, but repo allows Railway deploy too. Ensure platform choice is intentional (avoid dual-prod drift).

---

## 2) Health endpoint validation commands + expected responses

Set your deployed URLs first:

```bash
export GATEWAY_URL="https://gateway.<domain>"
export ISSUER_URL="https://issuer.<domain>"
export WALLET_URL="https://wallet.<domain>"
export RECRUITER_URL="https://recruiter.<domain>"
```

Run checks:

```bash
# Gateway (Vercel)
curl -fsS "$GATEWAY_URL/api/health" | jq

# Issuer (Railway)
curl -fsS "$ISSUER_URL/api/health" | jq
curl -i -fsS "$ISSUER_URL/api/health/relayer" | sed -n '1,20p'
curl -i -fsS "$ISSUER_URL/api/health/queue" | sed -n '1,40p'

# Wallet (Railway)
curl -fsS "$WALLET_URL/api/health" | jq

# Recruiter (Railway)
curl -fsS "$RECRUITER_URL/api/health" | jq
```

Expected baseline:
- **Gateway**: `{"status":"ok","app":"credverse-gateway"}` (HTTP 200)
- **Issuer**: HTTP 200 + JSON includes:
  - `status: "ok"`, `app: "issuer"`, `timestamp`
  - `queue.available` (boolean)
  - `blockchain.configured` (boolean), `blockchain.writesAllowed` (boolean), chain metadata
- **Issuer relayer health**:
  - HTTP 200 when `configured=true` and env complete
  - HTTP 503 when missing chain env / contract not deployed / RPC unreachable
- **Wallet**: HTTP 200 + `{ status: "ok", timestamp: ... }`
- **Recruiter**: HTTP 200 + `{ status: "ok", app: "recruiter", blockchain: {...} }`

Hard fail criteria:
- Any service `/api/health` non-200
- Issuer `/api/health/relayer` returns 503 in production cutover window
- `blockchain.configured=false` when on-chain anchoring is required for go-live policy

---

## 3) Secrets posture checks (what to verify now)

## Required controls
- Secrets must live in Vercel/Railway env managers only.
- `NODE_ENV=production` everywhere.
- Strong unique `JWT_SECRET` + `JWT_REFRESH_SECRET` in every service.
- Issuer must have:
  - `ISSUER_KEY_ENCRYPTION` (valid 64-hex)
  - `RELAYER_PRIVATE_KEY`
  - `REGISTRY_CONTRACT_ADDRESS`
  - RPC URL (`SEPOLIA_RPC_URL` or equivalent via chain resolver)
- Production hardening flags:
  - `ALLOW_DEMO_ROUTES=false`
  - `REQUIRE_DATABASE=true`
  - `REQUIRE_QUEUE=true` (issuer queue-backed paths)

## Quick command-level posture checks
```bash
# local preflight using non-committed env file
set -a; source .env.launch.local; set +a
node scripts/launch-gate-check.mjs
```

## Repo-detected secrets risks
1. **Script/docs drift**: docs reference `npm run gate:launch:strict`, but root `package.json` currently has no such script. Use direct `node scripts/launch-gate-check.mjs` unless script is restored.
2. **Dev fallback secrets exist in code paths** (`dev-only-secret-not-for-production`) but strict mode in production should fail fast. Ensure strict mode actually set (`NODE_ENV=production`, `REQUIRE_DATABASE=true`).
3. Gateway strict auth/session mode requires `REDIS_URL` in production path (`credverse-gateway/server/routes/auth.ts`). Missing this will hard-fail startup in strict mode.

---

## 4) Currently risky flags / runtime risks

1. **Blockchain deferred mode risk (issuer + recruiter)**
   - Runtime can legitimately report `blockchain.configured=false` if contract code absent/unreachable.
   - This is explicitly surfaced in health endpoints and should be treated as launch blocker if policy requires anchoring.

2. **Blockchain write policy risk**
   - Writes can be disabled by policy (`writesAllowed=false`) depending on selected chain + flags.
   - Example: zkEVM mainnet writes require explicit enable (`ENABLE_ZKEVM_MAINNET=true`).

3. **Queue degradation risk (issuer)**
   - If Redis is missing, queue-backed bulk issuance is disabled and health reports `queue.available=false`.
   - If `REQUIRE_QUEUE=true` in production, startup should fail fast (desired).

4. **Demo mode risk**
   - `ALLOW_DEMO_ROUTES` must stay `false` in production. Non-prod behavior allows demo/legacy paths.

5. **Doc vs implementation mismatch risk**
   - `DEPLOYMENT.md` states `npm run gate:launch:strict`; repo currently exposes only script file, not npm alias.

---

## 5) Rollback readiness checklist (must be pre-approved before GO)

Platform/application rollback checklist:

- [ ] **Vercel gateway rollback path tested**
  - [ ] Previous successful deployment identified
  - [ ] One-click redeploy/rollback rehearsal completed
  - [ ] Domain + TLS continuity verified post-rollback

- [ ] **Railway rollback path tested for issuer/wallet/recruiter**
  - [ ] Prior stable deployment IDs recorded
  - [ ] Rollback command/UI runbook documented
  - [ ] Service env snapshot/versioned before cutover

- [ ] **Data rollback strategy confirmed**
  - [ ] PostgreSQL backup taken pre-cutover
  - [ ] Restore drill timestamp and owner recorded
  - [ ] Redis flush/restore policy documented (if needed)

- [ ] **Contract/chain rollback posture**
  - [ ] Correct active registry address confirmed (Sepolia current listed in docs)
  - [ ] Relayer key rotation + emergency disable procedure documented
  - [ ] If on-chain writes fail, degraded-mode policy explicitly approved

- [ ] **Operational rollback readiness**
  - [ ] Alerting dashboards wired (Sentry + logs)
  - [ ] Incident commander + on-call contacts assigned
  - [ ] Roll-forward criteria vs rollback thresholds written

---

## 6) Readiness verdict

## **Recommendation: NO-GO (until live checks pass and blockers closed)**

### Why NO-GO now
- No verified live endpoint evidence provided in this audit session.
- Known high-risk runtime states are possible and must be explicitly ruled out in prod:
  - `blockchain.configured=false`
  - `writesAllowed=false`
  - issuer `queue.available=false`
- Launch-gate command mismatch (`npm run gate:launch:strict` missing) introduces process drift risk.

### Conditions to flip to GO
1. Capture and attach successful outputs for all health commands above (including issuer relayer/queue).
2. Confirm strict production env posture in platform UIs (JWT/DB/Redis/chain keys present; demo off).
3. Execute rollback rehearsal checklist (Vercel + Railway + DB restore validation).
4. Confirm issuer/recruiter blockchain runtime reports `configured=true` and expected write policy.

---

## Appendix: recommended one-shot smoke script

```bash
set -euo pipefail

: "${GATEWAY_URL:?missing}" "${ISSUER_URL:?missing}" "${WALLET_URL:?missing}" "${RECRUITER_URL:?missing}"

curl -fsS "$GATEWAY_URL/api/health" | jq -e '.status=="ok" and .app=="credverse-gateway"' >/dev/null
curl -fsS "$ISSUER_URL/api/health" | jq -e '.status=="ok" and .app=="issuer" and (.blockchain|type=="object")' >/dev/null
curl -fsS "$ISSUER_URL/api/health/relayer" | jq -e '.ok==true and .configured==true and (.missingEnvVars|length==0)' >/dev/null
curl -fsS "$WALLET_URL/api/health" | jq -e '.status=="ok"' >/dev/null
curl -fsS "$RECRUITER_URL/api/health" | jq -e '.status=="ok" and .app=="recruiter" and (.blockchain|type=="object")' >/dev/null

echo "Infra live smoke: PASS"
```
