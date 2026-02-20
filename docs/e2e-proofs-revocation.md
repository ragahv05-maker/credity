# Cross-service E2E + proofs runtime (deterministic)

## Scope
Covers recruiter-side real API E2E for:
- issuer -> wallet -> recruiter verification flow
- revocation status propagation
- proofs runtime fail-closed semantics (`/api/v1/proofs/*`)

## Reproducible root commands
From repo root:

```bash
npm run test:lane4:e2e
npm run test:proofs:runtime
npm run test:e2e:proofs:local
npm run test:e2e:proofs:ci
```

## Environment dependencies
Minimal env to run deterministic local/CI test fixtures:

- Node + npm (lockfile-based install)
- No live blockchain contract required (tests run in deferred mode)
- No Redis required (`REDIS_URL` optional)
- No DigiLocker credentials required for these test paths
- No Gemini API key required (`DeterministicFallbackAdapter` is used in wallet if missing)

Optional runtime knobs:
- `PROOF_REPLAY_WINDOW_MS` (default `600000`)
- `PROOF_METADATA_MAX_BYTES` (default `131072`)
- `CI=true` for CI style command

## Deterministic fixtures and semantics
- `tests/e2e-issuer-wallet-verifier.test.ts` uses stable payloads and deterministic proof mode permutations.
- `tests/revocation-status-propagation.test.ts` asserts revoked status propagation with local fixtures.
- `tests/proof-lifecycle.test.ts` asserts fail-closed API semantics:
  - unauthenticated -> `PROOF_AUTH_REQUIRED`
  - wrong role -> `PROOF_FORBIDDEN`
  - invalid DID input -> `PROOF_INPUT_INVALID`
  - replayed verify payload -> `PROOF_REPLAY_DETECTED`
  - oversized metadata payload -> 400/413 guarded behavior
- `tests/proof-verifier-service.test.ts` verifies deterministic merkle-membership checks.

## Notes
Warnings about deferred anchoring or missing optional providers are expected in this suite and do not indicate test failure.
