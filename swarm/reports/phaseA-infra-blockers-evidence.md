# Phase A Infra Blockers Evidence (code/process drift)

- Repo: `/Users/raghav/Desktop/credity12`
- Date: 2026-02-20 IST
- Source blocker file: `swarm/reports/infra-live-audit-credity12.md`
- Focus: NO-GO items caused by script/config/runtime drift (launch gate wiring, strict checks, smoke automation)

## Summary

Closed the key code/process drift blockers called out in the infra audit:

1. **Launch gate wiring restored**
   - Added root npm scripts:
     - `gate:launch`
     - `gate:launch:strict`
2. **Strict launch gate hardened**
   - Extended `scripts/launch-gate-check.mjs` to enforce production controls in strict mode:
     - `NODE_ENV=production`
     - `ALLOW_DEMO_ROUTES=false`
     - `REQUIRE_DATABASE=true`
     - `REQUIRE_QUEUE=true`
     - `ISSUER_KEY_ENCRYPTION` presence + 64-hex format
     - `RELAYER_PRIVATE_KEY`
     - `REGISTRY_CONTRACT_ADDRESS`
     - chain RPC presence (`SEPOLIA_RPC_URL`/`CHAIN_RPC_URL`/`RPC_URL`)
3. **Sentry env-name drift removed**
   - Gateway runtime now accepts both `SENTRY_DSN` and `GATEWAY_SENTRY_DSN`.
4. **Cloud Run env template parity fixed**
   - Added `SENTRY_DSN` + `GATEWAY_SENTRY_DSN` secret mappings in `infra/gcp/cloudrun/env.example.yaml`.
5. **Live smoke script added**
   - Added `scripts/infra-live-smoke.sh` and npm alias `smoke:infra:live`.

---

## Patch evidence

### Files changed

- `package.json`
- `scripts/launch-gate-check.mjs`
- `scripts/infra-live-smoke.sh` (new)
- `credverse-gateway/server/services/sentry.ts`
- `infra/gcp/cloudrun/env.example.yaml`

### Key diff snippets

```diff
+ "gate:launch": "node scripts/launch-gate-check.mjs",
+ "gate:launch:strict": "LAUNCH_GATE_STRICT=1 node scripts/launch-gate-check.mjs",
+ "smoke:infra:live": "bash scripts/infra-live-smoke.sh"
```

```diff
- const SENTRY_DSN = process.env.SENTRY_DSN;
+ const SENTRY_DSN = process.env.SENTRY_DSN || process.env.GATEWAY_SENTRY_DSN;
```

```diff
+ - name: SENTRY_DSN
+   source: projects/PROJECT_ID/secrets/SENTRY_DSN/versions/latest
+ - name: GATEWAY_SENTRY_DSN
+   source: projects/PROJECT_ID/secrets/GATEWAY_SENTRY_DSN/versions/latest
```

---

## Command run evidence

### 1) Verify script wiring + sentry/cloudrun/strict references

```bash
rg -n "gate:launch:strict|smoke:infra:live|gate:launch" package.json
rg -n "SENTRY_DSN|GATEWAY_SENTRY_DSN" credverse-gateway/server/services/sentry.ts infra/gcp/cloudrun/env.example.yaml scripts/launch-gate-check.mjs
```

Observed:
- `package.json` now contains `gate:launch`, `gate:launch:strict`, `smoke:infra:live`.
- `sentry.ts` now supports fallback env var.
- `env.example.yaml` now includes Sentry secret mappings.
- strict gate checks both DSN names.

### 2) Non-strict gate behavior (CI-safe docs/config check)

```bash
npm run gate:launch
```

Observed: **PASS** (docs/config checks pass; env checks advisory in non-strict mode).

### 3) Strict gate fail-fast behavior (without prod env loaded)

```bash
npm run gate:launch:strict
```

Observed: **FAIL (expected)** with required-check failures for missing env controls/secrets.

This confirms strict mode now blocks unsafe launch posture instead of allowing false-positive pass.

### 4) Smoke script syntax guard

```bash
bash -n scripts/infra-live-smoke.sh
```

Observed: no syntax errors.

---

## Incident-responder / security-auditor notes

- Changes are fail-closed in strict mode, reducing false-positive GO risk.
- Added controls align with audit NO-GO criteria around production hardening and issuer chain prerequisites.
- No secret values were generated or committed.
- Workspace was already dirty before this task; this report lists only targeted infra-drift remediations above.

## Residual operational dependency (still external)

- Live GO still requires real deployed URL health/smoke execution with production envs:
  - `GATEWAY_URL`, `ISSUER_URL`, `WALLET_URL`, `RECRUITER_URL`
  - then run `npm run smoke:infra:live`
