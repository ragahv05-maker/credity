# Credity Swarm S29 — Integrator Pass

## Scope

Integrated low-risk, non-conflicting improvements from prior swarm reports into a single patch pass in `/Users/raghav/Desktop/credity`, then ran check/tests.

## Integrated changes

### 1) Error taxonomy constant alignment (from S19 guidance)

Applied the documented baseline constant set consistently across services:

- Added `AUTH_UNAUTHORIZED` to Gateway observability constants.
- Added `NOT_FOUND` to Wallet/Issuer/Recruiter observability constants.

Files updated:

- `credverse-gateway/server/services/observability.ts`
- `BlockWalletDigi/server/middleware/observability.ts`
- `CredVerseIssuer 3/server/middleware/observability.ts`
- `CredVerseRecruiter/server/middleware/observability.ts`

Risk profile:

- Low-risk, additive constants only.
- No route behavior or response-shape changes.

### 2) Perf baseline follow-up utility (from S22 suggested next step)

Added a small parser script to convert perf baseline JSON into a markdown table.

Files updated:

- `scripts/perf-baseline-report.mjs` (new)
- `package.json` (new script: `perf:baseline:report`)

Behavior:

- Reads JSON from `PERF_INPUT` or default `swarm/reports/data/credity-s22-perf-baseline.json`.
- Writes markdown table to `PERF_MARKDOWN_OUTPUT` or default `swarm/reports/data/credity-s22-perf-baseline-table.md`.
- Fails fast with clear message if input is missing/invalid.

Risk profile:

- Tooling-only addition, no runtime API impact.

---

## Validation run

### Check / typecheck

- `packages/shared-auth`: `npm run build` ✅
- `BlockWalletDigi`: `npm run check` ✅
- `CredVerseRecruiter`: `npm run check` ✅
- `CredVerseIssuer 3`: `npm run check` ❌
  - Existing compile error observed:
  - `server/services/queue-service.ts(204,64): error TS2339: Property 'attemptsMade' does not exist on type '{ jobId: string; failedReason: string; prev?: string | undefined; }'.`

### Tests

- `CredVerseRecruiter`: `npm test -- oid4vp-wallet-binding.test.ts` ✅ (4 passed)
- `credverse-gateway`: `npm run test:proxy` ✅ (13 passed)
- `BlockWalletDigi`: `npm test -- tests/health.test.ts` ✅ (1 passed)

## Notes for main integrator

- S29 changes are intentionally narrow and low-risk.
- The Issuer check failure appears pre-existing/unrelated to this integrator patch (no `queue-service.ts` edits in this pass).
- If desired, next patch can isolate/fix the `attemptsMade` typing issue in Issuer queue-service as a separate scoped change.
