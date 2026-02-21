# Credity S05 — Proof Lifecycle Consistency Audit

## Scope

Audited proof canonicalization/hash/metadata behavior across:

- `BlockWalletDigi` (wallet)
- `CredVerseIssuer 3` (issuer)
- `CredVerseRecruiter` (recruiter/verifier)

Focus: deterministic hashing correctness, cross-service metadata alignment, backward compatibility for already-issued proofs/anchors.

---

## Findings

### 1) Critical hash canonicalization mismatch (Issuer + Recruiter blockchain service)

Both issuer and recruiter blockchain hash functions used:

- `JSON.stringify(data, Object.keys(data).sort())`

This is unsafe for nested credential payloads because replacer-array behavior can drop nested fields not present in top-level key set, causing non-intuitive/non-portable hashes.

### 2) Canonicalization metadata inconsistency

- Wallet proof metadata emits canonicalization as `RFC8785-V1`.
- Recruiter `/v1/proofs/metadata` previously returned `JCS-LIKE-V1` unconditionally.

This created cross-service semantic mismatch even when hashes happened to match for simple payloads.

### 3) Backward-compatibility gap in recruiter verification

Recruiter strict deterministic hash checks could reject historical credentials that were anchored/generated with the legacy top-level replacer behavior.

---

## Changes Implemented

### A) Recruiter: strict deterministic proof lifecycle + legacy fallback

**File:** `CredVerseRecruiter/server/services/proof-lifecycle.ts`

- Added explicit proof canonicalization types:
  - `RFC8785-V1` (strict default)
  - `JCS-LIKE-V1` (legacy label support)
- Added strict JSON validation for canonicalization (non-finite number / bigint / non-plain object guards).
- Implemented deterministic recursive canonical string generation.
- Added `deterministicHashLegacyTopLevel(...)` for backward compatibility with historical hashing behavior.
- Added `parseCanonicalization(...)`.

### B) Recruiter: blockchain hashing fixed to strict deterministic

**File:** `CredVerseRecruiter/server/services/blockchain-service.ts`

- `hashCredential(...)` now uses strict deterministic keccak hash via proof lifecycle utility (`RFC8785-V1`).

### C) Recruiter: verification engine compatibility hardening

**File:** `CredVerseRecruiter/server/services/verification-engine.ts`

- On-chain anchor check now:
  - Computes strict hash (`RFC8785-V1` or declared canonicalization).
  - Computes legacy top-level hash.
  - Accepts expected proof hash if either strict or legacy matches.
  - Falls back to legacy hash lookup on-chain if strict hash not anchored.
- Adds compatibility metadata in anchor-check details (`compatibilityMode`).

### D) Recruiter: proof routes metadata/verification alignment

**File:** `CredVerseRecruiter/server/routes/verification.ts`

- `/v1/proofs/verify` now accepts either strict or legacy computed hash for `expected_hash` comparison.
- `/v1/proofs/metadata` now:
  - Uses parsed canonicalization input (default strict)
  - Returns canonicalization consistently
  - Returns `proof_version: '1.0'`

### E) Issuer: strict deterministic hash implementation

**File (new):** `CredVerseIssuer 3/server/services/proof-lifecycle.ts`

- Added deterministic strict hashing and legacy top-level fallback helper.

### F) Issuer: blockchain anchoring hash fixed

**File:** `CredVerseIssuer 3/server/services/blockchain-service.ts`

- `hashCredential(...)` now uses deterministic keccak over strict canonical form (`RFC8785-V1`).

### G) Issuer: public proof metadata aligned

**File:** `CredVerseIssuer 3/server/routes/public.ts`

- Public proof payload now includes:
  - `canonicalization: 'RFC8785-V1'`
  - `proofVersion: '1.0'`

### H) Issuer: batch fallback hash determinism improved

**File:** `CredVerseIssuer 3/server/routes/standards.ts`

- Anchor batch fallback hash input now:
  - Uses SHA-256 over `vcJwt` when available, else
  - Deterministic strict SHA-256 over `credentialData`
- Replaces non-deterministic `JSON.stringify(credentialData)` fallback.

---

## Tests Added/Updated

### Recruiter

**File:** `CredVerseRecruiter/tests/proof-lifecycle.test.ts`

- Added coverage for legacy top-level hash acceptance in `/v1/proofs/verify`.
- Added deterministic nested key-order stability test for strict canonical mode.

### Issuer

**File (new):** `CredVerseIssuer 3/tests/proof-lifecycle.test.ts`

- Added deterministic nested key-order stability test.
- Added legacy-path compatibility test.

---

## Validation Run

### Recruiter

- Command: `npm test -- tests/proof-lifecycle.test.ts`
- Result: **PASS** (7 tests)

### Issuer

- Command: `npm test -- tests/proof-lifecycle.test.ts tests/anchor-batch-service.test.ts`
- Result: **PASS** (7 tests)

---

## Compatibility Notes

- New issuance/anchoring path is strict deterministic (`RFC8785-V1`).
- Recruiter verification remains backward compatible with historical legacy top-level hashes, preventing false negatives for previously anchored credentials.
- Wallet already used strict canonicalization metadata and did not require functional changes.
