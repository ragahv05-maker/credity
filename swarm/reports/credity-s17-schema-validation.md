# Credity S17 — Schema Validation Boundaries + Metadata Sanitization

## Scope completed

Strengthened credential/proof payload validation boundaries and sanitized unsafe metadata fields, with negative tests added.

## Changes made

### 1) Tightened proof payload schema validation in sharing routes

**File:** `BlockWalletDigi/server/routes/sharing.ts`

- Added Zod schemas:
  - `proofGenerateSchema`
    - `credentialId`: required string, min 1, max 256.
  - `proofVerifySchema`
    - `credential`: required object (`z.record(z.unknown())`), disallowing array/non-object payloads.
    - `proof.algorithm`: optional enum limited to `sha256`.
    - `proof.hash`: required 64-char hex digest (`/^[a-fA-F0-9]{64}$/`).
- `/wallet/proofs/generate`
  - now validates body via `proofGenerateSchema` before processing.
  - returns structured validation details on bad input.
- `/wallet/proofs/verify`
  - now validates body via `proofVerifySchema` before hash verification.
  - returns structured validation details on bad input.

### 2) Sanitized unsafe metadata from claimed offer proof payloads

**Files:**

- `BlockWalletDigi/server/utils/metadata-sanitizer.ts` (new)
- `BlockWalletDigi/server/routes/credentials.ts`

- Added utility: `sanitizeUnsafeMetadata(value, depth)`
  - strips prototype-pollution keys: `__proto__`, `prototype`, `constructor`.
  - only traverses plain objects.
  - caps recursion depth and collection sizes.
  - normalizes unsupported scalar/object forms safely.
- In `/wallet/offer/claim`:
  - added request validation for `url` (`z.string().url().max(2048)`).
  - added proof payload validation boundary (`algorithm=sha256`, `hash=64-hex`).
  - sanitizes proof metadata before persisting/returning.

## Negative tests added

### A) Proof verification boundary rejection

**File:** `BlockWalletDigi/tests/proof-lifecycle.test.ts`

- Added test: rejects malformed proof verify payloads:
  - non-object `credential` payload
  - invalid `proof.hash` format
- Asserts `400` + `PROOF_VERIFY_INPUT_INVALID` + validation details present.

### B) Metadata sanitization on credential offer claim

**File:** `BlockWalletDigi/tests/credentials-proof-schema-validation.test.ts` (new)

- Spins up a mock issuer endpoint returning proof metadata containing unsafe keys.
- Calls `/api/v1/wallet/offer/claim` with auth.
- Asserts response/proof persisted payload omits unsafe `constructor` key in nested metadata.

## Validation run

Executed:

```bash
npm test -- tests/proof-lifecycle.test.ts tests/credentials-proof-schema-validation.test.ts
```

Result: **2 passed test files, 9 passed tests**.
