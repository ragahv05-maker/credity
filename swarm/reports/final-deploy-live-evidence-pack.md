# Final Deployment + Live Evidence Runbook Pack

Date: 2026-02-21 (IST)  
Repo: `/Users/raghav/Desktop/credity`  
Scope: exact deploy sequence (Railway + Vercel), live smoke artifact collection template, rollback evidence template, and timestamped operator checklist.

---

## 1) Exact Deploy Sequence (Railway + Vercel)

> Goal: backend-first rollout on Railway, then gateway cutover on Vercel, then production smoke + evidence capture.

### A. Preconditions (must be true before deployment)

1. Release branch merged; commit SHA frozen and recorded.
2. Mandatory runtime env present in provider secret managers:
   - `JWT_SECRET`, `JWT_REFRESH_SECRET`
   - `REDIS_URL`
   - `SENTRY_DSN` / `GATEWAY_SENTRY_DSN`
   - `ISSUER_KEY_ENCRYPTION`, `RELAYER_PRIVATE_KEY`, `REGISTRY_CONTRACT_ADDRESS`
3. Run locally (or CI) and archive output:
   - `npm run check`
   - `npm test`
   - `npm run gate:launch:strict`
   - `npm run gate:contracts:security`
4. Rollback target identified:
   - Railway previous successful deployment IDs for Issuer/Wallet/Recruiter
   - Vercel previous production deployment URL/ID for gateway

### B. Deploy order and hard checks

#### Step 1 — Railway deploy: Issuer
- Root directory: `CredVerseIssuer 3`
- Trigger deploy from release SHA.
- Wait for “healthy” state.
- Verify:
  - `curl https://issuer.<domain>/api/health`
  - `curl https://issuer.<domain>/api/health/relayer`

#### Step 2 — Railway deploy: Wallet
- Root directory: `BlockWalletDigi`
- Trigger deploy from same release SHA.
- Verify:
  - `curl https://wallet.<domain>/api/health`

#### Step 3 — Railway deploy: Recruiter
- Root directory: `CredVerseRecruiter`
- Trigger deploy from same release SHA.
- Verify:
  - `curl https://recruiter.<domain>/api/health`

#### Step 4 — Cross-service backend smoke (before gateway switch)
```bash
GATEWAY_URL=https://gateway.<domain> \
ISSUER_URL=https://issuer.<domain> \
WALLET_URL=https://wallet.<domain> \
RECRUITER_URL=https://recruiter.<domain> \
npm run smoke:infra:live
```
Expected: `Infra live smoke: PASS`

#### Step 5 — Vercel deploy: Gateway
- Project root: `credverse-gateway`
- Promote release SHA to production.
- Verify:
  - `curl https://gateway.<domain>/api/health`

#### Step 6 — Full live smoke + evidence capture
```bash
RELEASE_TAG=<tag-or-sha> \
OPERATOR="<name>" \
GATEWAY_URL=https://gateway.<domain> \
ISSUER_URL=https://issuer.<domain> \
WALLET_URL=https://wallet.<domain> \
RECRUITER_URL=https://recruiter.<domain> \
RUN_LAUNCH_GATE_STRICT=1 \
bash scripts/capture-live-evidence.sh
```
Artifacts are written to: `evidence-pack/live/<release>/<timestamp>/`

#### Step 7 — Go/No-Go decision
Go only if all are true:
- all 4 health endpoints green,
- infra smoke pass,
- no Sev-1/Sev-2 incidents open,
- release owners sign.

---

## 2) Live Smoke Artifact Collection Template

Use this template in release notes or incident thread.

```md
# Live Smoke Evidence — <release>

- Environment: production
- Release tag/SHA: <...>
- Operator: <...>
- Started at (IST): <...>
- Completed at (IST): <...>
- Evidence directory: evidence-pack/live/<release>/<timestamp>/

## Endpoint checks
- [ ] gateway `/api/health` (200 + expected payload)
- [ ] issuer `/api/health` (200 + expected payload)
- [ ] issuer `/api/health/relayer` (ok=true, configured=true)
- [ ] wallet `/api/health` (200)
- [ ] recruiter `/api/health` (200 + expected payload)

## Command transcript
```bash
<insert live-smoke.log contents or file link>
```

## Attachments
- metadata.txt
- gateway-health.json
- issuer-health.json
- issuer-relayer-health.json
- wallet-health.json
- recruiter-health.json
- live-smoke.log
- gate-launch-strict.log (if run)

## Result
- Decision: GO / NO-GO
- Decision owners: <...>
- Decision timestamp (IST): <...>
- Notes: <...>
```

---

## 3) Rollback Evidence Template

```md
# Rollback Evidence — <release>

- Incident/ref: <...>
- Trigger condition: <what failed>
- Rollback initiated by: <name>
- Rollback start (IST): <...>
- Rollback complete (IST): <...>

## Reverted artifacts
- Railway Issuer deployment ID: <old-id>
- Railway Wallet deployment ID: <old-id>
- Railway Recruiter deployment ID: <old-id>
- Vercel Gateway deployment ID/URL: <old-id-or-url>

## Config rollback (if applicable)
- [ ] JWT secrets restored to last-known-good secret version
- [ ] Queue/relayer env restored (`REQUIRE_QUEUE`, `BLOCKCHAIN_ANCHOR_MODE`, chain vars)
- [ ] Gateway upstream mapping restored

## Post-rollback validation
- [ ] `issuer/api/health` OK
- [ ] `issuer/api/health/relayer` OK
- [ ] `wallet/api/health` OK
- [ ] `recruiter/api/health` OK
- [ ] `gateway/api/health` OK
- [ ] critical user journey smoke pass

## Evidence links
- Provider deployment screenshots/links:
- Logs:
- Smoke output:

## Closure
- Residual impact: <...>
- Next corrective action owner: <...>
- RCA due date: <...>
```

---

## 4) Operator Checklist with Timestamps (Execution Clock)

| Time (IST) | Owner | Action | Evidence required | Status |
|---|---|---|---|---|
| T-60m | Release Manager | Freeze SHA/tag and announce window | Release message + SHA | ☐ |
| T-50m | Security Lead | Verify mandatory secrets present (masked) | Secret manager snapshots | ☐ |
| T-45m | Operator | Run `npm run gate:launch:strict` | Log artifact | ☐ |
| T-40m | Operator | Run `npm run gate:contracts:security` | CI/log link | ☐ |
| T-30m | Operator | Deploy Issuer on Railway | deployment ID + health curl | ☐ |
| T-22m | Operator | Deploy Wallet on Railway | deployment ID + health curl | ☐ |
| T-15m | Operator | Deploy Recruiter on Railway | deployment ID + health curl | ☐ |
| T-10m | Operator | Run backend smoke (`npm run smoke:infra:live`) | smoke log | ☐ |
| T-05m | Operator | Deploy Gateway on Vercel | deployment URL + health curl | ☐ |
| T+00m | Operator | Run `scripts/capture-live-evidence.sh` | evidence-pack path | ☐ |
| T+10m | Release+Security | Go/No-Go review | signed decision note | ☐ |
| T+20m | Incident Commander | If NO-GO: execute rollback runbook | rollback evidence sheet | ☐ |

---

## 5) Supporting Script Added

- `scripts/capture-live-evidence.sh`
  - Creates timestamped evidence folder.
  - Captures health JSON payloads for all services.
  - Executes canonical infra smoke (`scripts/infra-live-smoke.sh`) and stores transcript.
  - Optionally captures `npm run gate:launch:strict` log (`RUN_LAUNCH_GATE_STRICT=1`).

This script is intended for final cutover evidence and audit traceability.
