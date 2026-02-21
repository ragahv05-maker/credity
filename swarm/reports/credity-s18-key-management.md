# S18 — Key-management hardening & rotation hooks (CredVerse Issuer)

## Scope completed

Hardened issuer signing/encryption key handling in `CredVerseIssuer 3` with explicit rotation hooks, safer defaults/warnings, and tests/docs updates while preserving local development behavior.

## Changes made

### 1) Hardened VC signer key-management defaults

**File:** `CredVerseIssuer 3/server/services/vc-signer.ts`

- Replaced single-key static behavior with structured in-memory key store per issuer:
  - `activeKid`
  - multiple signing keys (key history)
  - metadata (`createdAt`, `retiredAt`, `updatedAt`)
- Added strict encryption-key validation (`64-char hex`) for `ISSUER_KEY_ENCRYPTION`.
- Production hard-fail if encryption key is missing/invalid or set to unsafe fallback.
- Dev/test compatibility preserved:
  - if key missing/invalid, service falls back to legacy unsafe default and emits stronger warnings.
- Added encryption key-ring support:
  - active key: `ISSUER_KEY_ENCRYPTION`
  - fallback keys: `ISSUER_KEY_ENCRYPTION_PREVIOUS` (comma-separated)
  - decrypt attempts active key first, then fallback keys.

### 2) Added rotation hooks

**File:** `CredVerseIssuer 3/server/services/vc-signer.ts`

- `rotateIssuerSigningKey(issuerId)`
  - creates new signer key (`#keys-N`), retires previous active key, switches active key.
- `rotateIssuerEncryptionKeys()`
  - re-encrypts all in-memory issuer private keys using current active encryption key.
- Added small diagnostics helper:
  - `getKeyManagementStatus(issuerId)`.

### 3) JWT `kid` behavior improved for rotation

**Files:**

- `CredVerseIssuer 3/server/services/vc-signer.ts`
- `CredVerseIssuer 3/server/routes/verify.ts`

- JWT signing now sets `kid` to current active issuer key id (not hardcoded `#keys-1`).
- Verification route now decodes JWT header and resolves issuer public key by `kid` (`getIssuerPublicKey(iss, kid)`), allowing old JWTs to remain verifiable after signer rotation.

### 4) Tests added

**File:** `CredVerseIssuer 3/tests/vc-signer-key-management.test.ts`

Added coverage for:

- signer-key rotation preserving verification for previously issued JWTs via `kid` lookup.
- encryption-key rotation hook re-encrypting keys without breaking issuer key retrieval.

Test run:

- `npm test -- tests/vc-signer-key-management.test.ts` ✅ (2 tests passed)

### 5) Docs / env templates updated

**Files:**

- `DEPLOYMENT.md`
- `.env.launch.example`
- `infra/gcp/cloudrun/env.example.yaml`

Updates include:

- documenting `ISSUER_KEY_ENCRYPTION_PREVIOUS` for staged key rotation.
- explicit `RELAYER_PRIVATE_KEY` requirement/format note.
- adding issuer encryption secrets to Cloud Run secret examples.

## Notes / caveats

- Key store remains in-memory (existing architectural limitation). Rotation hooks currently apply to runtime memory, not persisted secure storage.
- Full production-grade rotation (HSM/Vault + persisted key versions + audit trail + key retirement policy) still requires external secret manager integration.
- Type-check (`npm run check`) was started but not allowed to complete in this session; targeted test coverage passed for new functionality.
