# Credity P0B Recruiter E2E Fix Report

## Summary

Fixed the recruiter blocker in `CredVerseRecruiter/tests/e2e-issuer-wallet-verifier.test.ts` where `proof` was `null` in blockchain proof-mode paths (causing `proof.deferred` assertion failure).

## Root Cause

Wallet claim route (`BlockWalletDigi/server/routes/credentials.ts`) used a strict proof schema expecting `proof.hash` (sha256 hex) on incoming offer payloads.

Issuer offer-consume response in this flow returns blockchain metadata proof object with fields like:

- `hashAlgorithm`
- `credentialHash` (often `null` in deferred / writes-disabled states)
- `deferred`
- `code`

Because `hash` was missing and/or `credentialHash` could be `null`, schema validation failed and wallet set `proofMeta = null`.

## Changes Made (minimal/safe)

### 1) Relaxed and normalized wallet proof payload parsing

**File:** `BlockWalletDigi/server/routes/credentials.ts`

Updated `proofPayloadSchema` to:

- accept both `hash` and `credentialHash`
- accept `hashAlgorithm`
- tolerate nullable values (`null`) from issuer deferred-mode metadata
- preserve passthrough metadata (`deferred`, `code`, etc.)
- normalize aliases via transform:
  - `algorithm` inferred from `hashAlgorithm` when `sha256`
  - `hash` mapped from `hash || credentialHash || undefined`

This keeps existing sanitization and compatibility behavior while avoiding null-proof drops for blockchain metadata proof objects.

## Validation / Test Results

### Targeted failing test

Command:

- `cd CredVerseRecruiter && npx vitest run tests/e2e-issuer-wallet-verifier.test.ts`

Result:

- **PASS** (`3 passed`)

### Requested recruiter suite

Command:

- `npm run test:recruiter`

Result:

- **PASS** (`9 files passed, 34 tests passed`)

## Changed Files

- `BlockWalletDigi/server/routes/credentials.ts`
