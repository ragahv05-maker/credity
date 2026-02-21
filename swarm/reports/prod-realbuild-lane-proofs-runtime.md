# Prod Realbuild Lane — Proofs Runtime Unsupported-Path Audit

## Scope

Repo audited: `/Users/raghav/Desktop/credity`

Focus:

- Audit proof-generation runtime behavior on `unsupported` paths.
- Convert critical production path to real enabled flow where feasible.
- Otherwise enforce fail-closed behavior with explicit integration requirement and no fake-success semantics.

## Audit Findings

### 1) Critical production path already real for `merkle-membership`

**File:** `CredVerseIssuer 3/server/services/proof-service.ts`

- `format: 'merkle-membership'` executes concrete deterministic proof generation:
  - canonicalized claims digest
  - deterministic leaf hash
  - executable proof envelope (`credity.merkle-membership-proof/v1`)
  - public signals emitted for verifier compatibility
- This remains the only truly enabled generation path in current runtime.

### 2) Unsupported formats had success-like semantics

**Before:**

- `/api/v1/proofs/generate` returned `202` for non-enabled formats with code `PROOF_UNSUPPORTED_FORMAT`.
- This is non-failing HTTP behavior and can be interpreted as accepted work rather than an explicit integration block.

### 3) Invalid format coercion risk

**Before:**

- Route used `mapProofFormat(...)` that silently coerced unknown formats to `'sd-jwt-vc'`.
- This allowed malformed/unknown input to bypass strict validation and enter unsupported path behavior.

## Changes Implemented

### A) Fail-closed runtime behavior for non-enabled formats

**File:** `CredVerseIssuer 3/server/routes/standards.ts`

- Replaced 202 unsupported response with explicit hard-fail:
  - HTTP `501`
  - `code: 'PROOF_INTEGRATION_REQUIRED'`
  - `integration_required: true`
- Response still preserves contract status (`status: 'unsupported'`) but no longer appears successful at transport level.

### B) Removed fallback coercion; enforce strict format parsing

**File:** `CredVerseIssuer 3/server/routes/standards.ts`

- Replaced permissive `mapProofFormat` with strict `parseProofFormat` + allowlist.
- Unknown format now returns:
  - HTTP `400`
  - `code: 'PROOF_FORMAT_INVALID'`
  - explicit `allowed_formats` list
- Added `ldp_vc` to recognized format set (contract-aligned), eliminating implicit remap drift.

### C) Explicit integration-requirement reason in service-level unsupported result

**File:** `CredVerseIssuer 3/server/services/proof-service.ts`

- Updated unsupported reason text to explicitly state production prover integration requirement.

## Evidence Tests Added/Updated

### Updated tests

1. **`CredVerseIssuer 3/tests/proof-authz.test.ts`**
   - Updated authorized API-key path expectation to deterministic `404` (no more `202` branch).
   - Added fail-closed unsupported-format test:
     - expects `501`, `PROOF_INTEGRATION_REQUIRED`, `integration_required: true`.
   - Added invalid-format test:
     - expects `400`, `PROOF_FORMAT_INVALID`, includes allowlist.

2. **`CredVerseIssuer 3/tests/proof-service.test.ts`**
   - Strengthened unsupported format test to assert explicit integration-requirement reason string.

## Test Execution Evidence

Command run:

```bash
cd "CredVerseIssuer 3"
npm test -- tests/proof-service.test.ts tests/proof-authz.test.ts
```

Result:

- `2` test files passed
- `9` tests passed
- `0` failed

## Outcome

- `merkle-membership` remains real enabled proof-generation runtime path.
- All other non-integrated formats now fail closed with explicit integration requirement.
- Unknown formats no longer silently coerce to fallback values.
- No fake success behavior on unsupported generation paths.
