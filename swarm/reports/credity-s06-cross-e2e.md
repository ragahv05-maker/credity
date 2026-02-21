# S06 — Cross-service E2E expansion (issuer → wallet → recruiter)

## Scope completed

Implemented expanded cross-service E2E coverage in:

- `CredVerseRecruiter/tests/e2e-issuer-wallet-verifier.test.ts`

### What was added

1. **Issuer auth permutations**
   - Missing auth → `401`
   - Invalid API key → `401`
   - Valid API key flow (issue → offer → wallet claim) → success
   - Valid Bearer token flow (issue → offer → wallet claim) → success

2. **Deterministic chain mode matrix**
   - Added deterministic mode control by mocking issuer blockchain runtime status via:
     - `issuerBlockchainService.getRuntimeStatus()`
   - Covered 3 modes with explicit assertions:
     - `active` → `deferred=false`, `BLOCKCHAIN_ACTIVE`
     - `deferred` → `deferred=true`, `BLOCKCHAIN_DEFERRED_MODE`
     - `writes-disabled` → `deferred=true`, `BLOCKCHAIN_WRITES_DISABLED`

3. **Verifier success/failure + auth permutations**
   - Metadata endpoint without auth → `401`, `PROOF_AUTH_REQUIRED`
   - Metadata endpoint wrong role token → `403`, `PROOF_FORBIDDEN`
   - Proof verify success with computed hash → `PROOF_VALID`
   - Proof verify failure with mismatched hash → `PROOF_HASH_MISMATCH`

4. **Speed/determinism characteristics**
   - Reused in-memory Express apps (issuer/wallet/recruiter) in one suite
   - No UI/browser dependencies
   - Deterministic test identifiers (suffix-based instead of `Date.now()`)
   - No random assertions around deferred/active behavior (fully mode-driven)

## Validation run

Executed:

```bash
cd /Users/raghav/Desktop/credity/CredVerseRecruiter
npm test -- tests/e2e-issuer-wallet-verifier.test.ts
```

### Result

Run was **blocked by a pre-existing syntax error** in recruiter codebase (not introduced by this task):

- File: `CredVerseRecruiter/server/routes/verification.ts`
- Error: `Unexpected "}"` at/near line `703`

Because this parse error occurs during transform/import, Vitest reports no tests executed for the suite.

## Notes for integrator

- S06 changes are isolated to the e2e test file above.
- Once the syntax error in `server/routes/verification.ts` is fixed, rerun the same Vitest command to execute and verify the expanded matrix.
