# NOVA-VERTICALS Batch 1 (First 6 Hours)

## Scope executed

- PRD v2.0 Section 6.1.1 **SDK-First Distribution** scaffolded as a concrete package.
- Preserved interoperability contracts by reusing `@credverse/shared-auth` reputation contract types.
- Root-cause fix target: no canonical SDK existed despite API surface being present; teams were integrating against raw endpoints ad hoc.

## Exact repo file edits

### Added

1. `packages/trust-sdk/package.json`
2. `packages/trust-sdk/tsconfig.json`
3. `packages/trust-sdk/src/types.ts`
4. `packages/trust-sdk/src/client.ts`
5. `packages/trust-sdk/src/index.ts`
6. `packages/trust-sdk/tests/sdk-verify.test.mjs`
7. `packages/trust-sdk/README.md`
8. `docs/plans/2026-02-17-nova-verticals-batch1.md`

### Modified

9. `package.json`
   - Added scripts: `test:trust-sdk`, `lint:trust-sdk`, `check:trust-sdk`
   - Wired trust-sdk into root `test` and `check`

## What this unlocks (PRD alignment)

- PRD SDK example (`new CredVerse().verify(...)`) is now implemented in-repo.
- Vertical abstraction present (`OVERALL`, `DATING`, `HIRING`, `GIG`, `RENTAL`, `HEALTH`, `EDUCATION`, `FINANCE`, `IDENTITY`).
- Decision output standardized: `APPROVE | REVIEW | REJECT` from normalized score.
- Reputation and SafeDate flows unified under one SDK entrypoint.

## Tests planned/executed for this batch

### Included in-repo

- `packages/trust-sdk/tests/sdk-verify.test.mjs`
  - verifies OVERALL score normalization (0-1000 → 0-100) and decision mapping
  - verifies DATING vertical uses SafeDate endpoint semantics

### Next run commands (batch gate)

1. `cd packages/trust-sdk && npm install && npm test`
2. `cd /Users/raghav/Desktop/credity && npm run check:trust-sdk`
3. `cd /Users/raghav/Desktop/credity && npm run test:trust-sdk`

## Next 6-hour tranche (planned)

1. Add `verify()` compatibility mode for `subjectDid` + `userId` fallback from gateway identity map.
2. Add typed errors (`CredVerseApiError`, retriable/non-retriable split) and retry budget for 429/503.
3. Add contract conformance tests against `docs/openapi/v1.yaml` reputation endpoints.
4. Add SDK usage example integration to `CredVerseRecruiter` and `apps/mobile` for one end-to-end route.
5. Add CI job stage for `@credverse/trust` publish dry-run artifact.
