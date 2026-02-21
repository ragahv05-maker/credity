# Credity S13 — ZK Path Upgrade (Scaffold → Executable Contract Path)

## Scope completed

Advanced the proof lifecycle from passive scaffold toward an executable pipeline **without external proving artifacts** by implementing:

1. **Issuer-side proof generation service** with deterministic behavior
2. **Recruiter-side proof verification service** aligned to shared contracts
3. **Deterministic error codes** for generation/verification failure states
4. **Tests + docs/report** for regression safety and handoff

---

## What changed

### 1) Issuer: executable proof generation interface

**New file:** `CredVerseIssuer 3/server/services/proof-service.ts`

Implemented `generateProof(...)` with:

- `merkle-membership` format as an executable, deterministic path
- deterministic envelope output:
  - `type: credity.merkle-membership-proof/v1`
  - `verification_contract: credity-proof-verification/v1`
  - `claims_digest` and `leaf_hash` computed with canonical hashing (`RFC8785-V1`, `sha256`)
- deterministic failures via `ProofGenerationError`:
  - `PROOF_CREDENTIAL_ID_REQUIRED`
  - `PROOF_CREDENTIAL_NOT_FOUND`
- non-enabled formats return contract-compliant `status: unsupported`

**Updated file:** `CredVerseIssuer 3/server/routes/standards.ts`

- `/api/v1/proofs/generate` now uses `generateProof(...)`
- response semantics improved:
  - `201 + PROOF_GENERATED` on generated proof
  - `202 + PROOF_UNSUPPORTED_FORMAT` for currently unsupported formats
- deterministic route-level errors:
  - `PROOF_INPUT_INVALID`
  - `PROOF_CREDENTIAL_NOT_FOUND`
  - `PROOF_FORBIDDEN`
  - `PROOF_GENERATE_INTERNAL_ERROR`

### 2) Recruiter: verification contract between services

**New file:** `CredVerseRecruiter/server/services/proof-verifier-service.ts`

Implemented `verifyProofContract(...)` with:

- `merkle-membership` verification path:
  - validates required fields (`credential_id`, `claims_digest`, `leaf_hash`)
  - recomputes expected leaf hash deterministically
  - enforces challenge/domain binding when provided
  - enforces expected DID constraints when provided
- keeps existing compatibility behavior:
  - JWT proof verification via `verificationEngine`
  - object proof hash checks with strict + legacy fallback
  - revocation witness invalidation
- deterministic verification errors via `ProofVerificationError` (`PROOF_INPUT_INVALID`)
- deterministic output code (`PROOF_VALID` or first reason code)

**Updated file:** `CredVerseRecruiter/server/routes/verification.ts`

- `/v1/proofs/verify` now delegates to `verifyProofContract(...)`
- route now maps typed deterministic errors cleanly
- replay protection behavior retained

### 3) Tests added

**New issuer tests:** `CredVerseIssuer 3/tests/proof-service.test.ts`

- generated merkle-membership proof envelope
- unsupported format behavior
- deterministic missing-credential error code

**New recruiter tests:** `CredVerseRecruiter/tests/proof-verifier-service.test.ts`

- valid merkle-membership contract verification
- challenge mismatch deterministic failure code

---

## Validation run

### Issuer

`cd "CredVerseIssuer 3" && npm test -- tests/proof-service.test.ts tests/proof-lifecycle.test.ts`

- ✅ Passed

### Recruiter

`cd "CredVerseRecruiter" && npm test -- tests/proof-verifier-service.test.ts tests/proof-lifecycle.test.ts`

- ✅ Passed

---

## Notes / limitations (intentional)

- No external circom/snarkjs/plonk artifacts were introduced (as requested).
- This upgrade provides a deterministic, executable contract path for `merkle-membership` while keeping other proof formats safely contract-stubbed (`unsupported`).
- Cryptographic zk-SNARK generation/verification adapter wiring remains future work once proving/verifying artifacts and runtime are available.

## Suggested next step

- Introduce adapter registry (`proof backend drivers`) and plug first real backend behind current deterministic contract, preserving current error/code semantics for backward compatibility.
