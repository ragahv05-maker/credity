# Credity S15 — Canonicalization Differential Test Expansion

## Scope completed

Expanded canonicalization differential tests for strict mode (`RFC8785-V1`) vs legacy fallback (`JCS-LIKE-V1` / top-level legacy path) across services, while preserving strict canonicalization as signing source-of-truth.

## What was added

### 1) Issuer: canonicalization edge + differential coverage

**File:** `CredVerseIssuer 3/tests/proof-lifecycle.test.ts`

- Added differential test confirming strict hash differs from legacy top-level fallback for nested payloads.
- Added strict-mode rejection tests for:
  - non-finite numbers (`NaN`, `Infinity`)
  - non-plain objects (`Date`)
- Kept and validated deterministic nested key-order invariance.

### 2) Issuer: signing source-of-truth strictness

**File:** `CredVerseIssuer 3/tests/proof-service.test.ts`

- Added assertion that generated proof envelope remains strict:
  - `proof.canonicalization === 'RFC8785-V1'`
  - `claims_digest` is not the legacy top-level digest for a nested payload
- Confirms generation path signs from strict canonical form, not legacy fallback.

### 3) Recruiter: strict-vs-legacy differential + edge cases

**File:** `CredVerseRecruiter/tests/proof-lifecycle.test.ts`

- Added differential test asserting strict digest differs from legacy digest on nested structures.
- Added strict-mode rejection tests for invalid canonical JSON inputs:
  - `NaN`
  - non-plain object (`Date`)
- Added legacy compatibility test confirming `JCS-LIKE-V1` path accepts historical payload forms.

### 4) Wallet: strict source + fallback verification behavior

**File:** `BlockWalletDigi/tests/proof-lifecycle.test.ts`

- Added strict source-of-truth test for generated metadata:
  - generated proof canonicalization is strict (`RFC8785-V1`)
  - strict verification succeeds using generated hash
- Added fallback test showing verification accepts legacy-only hash (`JCS-LIKE-V1`) when proof metadata indicates strict canonicalization (backward compatibility path).
- Used exported `computeDeterministicHash(..., 'JCS-LIKE-V1')` to derive deterministic legacy test vector at runtime.

## Test execution

Executed targeted suites in all touched services:

- `CredVerseIssuer 3`: `tests/proof-lifecycle.test.ts`, `tests/proof-service.test.ts`
  - **Passed:** 9/9
- `CredVerseRecruiter`: `tests/proof-lifecycle.test.ts`
  - **Passed:** 13/13
- `BlockWalletDigi`: `tests/proof-lifecycle.test.ts`
  - **Passed:** 7/7

All newly added canonicalization differential and edge-case tests passed.

## Notes

- Non-blocking runtime warnings observed in test logs (dev JWT secret fallback, optional DigiLocker config, baseline-browser-mapping update notice); unrelated to canonicalization behavior.
