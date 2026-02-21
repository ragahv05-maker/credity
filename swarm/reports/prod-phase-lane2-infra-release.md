# Prod Phase Lane 2 — Infra Release Verification & Hardening

Date: 2026-02-21  
Repo: `/Users/raghav/Desktop/credity`  
Assessor mode: incident-responder + security-auditor + healthcheck + planning-with-files

## 1) Objective

Verify and harden production workflow around:

- launch gate strictness
- smoke scripts
- env drift checks
- rollback method verification

---

## 2) Commands Executed + Result

| Check                                                         | Command                                                                | Result                                                  |
| ------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------- |
| Launch gate baseline (non-strict)                             | `npm run gate:launch`                                                  | ✅ PASS                                                 |
| Strict launch gate using local launch env                     | `set -a; source .env.launch.local; set +a; npm run gate:launch:strict` | ❌ FAIL (6 required checks failed)                      |
| Smoke script syntax/tooling                                   | `bash -n scripts/infra-live-smoke.sh` + `command -v jq`                | ✅ PASS                                                 |
| Smoke script guardrails (required vars)                       | `./scripts/infra-live-smoke.sh` (without env)                          | ✅ PASS (fails fast as designed: missing `GATEWAY_URL`) |
| Strict launch gate with explicit placeholder-safe prod values | `LAUNCH_GATE_STRICT=1 ... node scripts/launch-gate-check.mjs`          | ✅ PASS                                                 |
| New production workflow integrity healthcheck                 | `npm run healthcheck:prod-workflow`                                    | ✅ PASS                                                 |

### Strict gate failure details from `.env.launch.local`

Failed required checks:

- `NODE_ENV=production`
- `ALLOW_DEMO_ROUTES=false`
- `REQUIRE_DATABASE=true`
- `REQUIRE_QUEUE=true`
- `ISSUER_KEY_ENCRYPTION` present + valid 64-hex format

This is an env hardening/config drift issue for local launch profile inputs.

---

## 3) Hardening Changes Applied

### A) Launch gate CI now enforces strict mode

Updated `.github/workflows/launch-gate.yml`:

- moved from non-strict to strict launch gate execution
- injects safe placeholder env values so strict logic is exercised in CI
- added production workflow healthcheck step:
  - `npm run healthcheck:prod-workflow`

### B) Added production workflow healthcheck script

Created `scripts/production-workflow-healthcheck.mjs` and npm script:

- verifies `.env.launch.example` contains required strict-gate keys
- verifies smoke script enforces required URLs + relayer probe
- verifies rollback method docs include Railway + Vercel rollback paths

`package.json` added:

- `"healthcheck:prod-workflow": "node scripts/production-workflow-healthcheck.mjs"`

---

## 4) Security / Reliability Findings

1. **CI strictness gap closed** (previously launch-gate workflow was non-strict).
2. **Local env drift remains open**: `.env.launch.local` failed strict gate on key production controls.
3. **Smoke script is correctly fail-fast** and checks relayer readiness.
4. **Rollback documentation exists and includes platform-specific path**, but rollback execution remains a manual operational step (no automated rehearsal command in this run).

---

## 5) GO/NO-GO Delta List

## Blocking deltas (must close for GO)

- [ ] Fix `.env.launch.local`/runtime secret profile to satisfy strict gate controls:
  - `NODE_ENV=production`
  - `ALLOW_DEMO_ROUTES=false`
  - `REQUIRE_DATABASE=true`
  - `REQUIRE_QUEUE=true`
  - valid `ISSUER_KEY_ENCRYPTION` (64-char hex)
- [ ] Execute **live infra smoke** with real production/staging URLs:
  - `GATEWAY_URL`, `ISSUER_URL`, `WALLET_URL`, `RECRUITER_URL`
- [ ] Record rollback rehearsal evidence (artifact IDs + timestamps + operator)

## Non-blocking improvements

- [ ] Add automated rollback drill script (staging) to reduce manual ambiguity.
- [ ] Add CI artifact emission for `healthcheck:prod-workflow` output.

---

## 6) Decision

**Current decision: NO-GO (conditional)**

Reason: strict gate fails against current local launch env profile and live smoke against target URLs is not yet evidenced in this run.

Once blocking deltas above are closed and evidence attached, status can be promoted to **GO**.
