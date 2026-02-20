# Production Mock/Stub Elimination Report — Core Runtime Paths

Date: 2026-02-21
Repo: `/Users/raghav/Desktop/credity`

## Scope completed
Focused runtime server-path mock/stub removal for:
1. `BlockWalletDigi/server/services/wallet-service.ts` simulateAnchor path
2. DigiLocker demo-mode production hard-fail behavior
3. `CredVerseIssuer 3/server/services/ipfs.ts` mock JWT/CID fallback
4. Recruiter SafeDate/WorkScore stub evidence summaries

---

## Changes made

### 1) BlockWalletDigi wallet anchoring: removed async simulate path from runtime store flow
**File:** `BlockWalletDigi/server/services/wallet-service.ts`

- Removed delayed `setTimeout(...simulateAnchor...)` behavior from `storeCredential` runtime path.
- `storeCredential` now performs anchoring through `anchorCredential(...)` before credential persistence.
- Added real integration path using `WALLET_ANCHOR_SERVICE_URL` (HTTP POST with credential metadata/hash).
- Added **fail-closed production rule**:
  - If `NODE_ENV=production` and `WALLET_ANCHOR_SERVICE_URL` is not configured, throw:
    - `Credential anchoring unavailable in production: configure WALLET_ANCHOR_SERVICE_URL`
- Non-production retains deterministic simulated anchoring only as dev fallback.

### 2) DigiLocker: hard-fail in production when not configured
**File:** `BlockWalletDigi/server/services/digilocker-service.ts`

- Constructor now throws in production when DigiLocker credentials are absent:
  - `[DigiLocker] Missing DIGILOCKER_CLIENT_ID / DIGILOCKER_CLIENT_SECRET in production`
- Added explicit runtime guard `ensureDemoModeAllowed()`.
- All demo branches (`exchangeCodeForTokens`, `getUserInfo`, `listDocuments`, `pullDocument`) call this guard and throw if production.

### 3) CredVerseIssuer IPFS: removed mock JWT/CID fallbacks
**File:** `CredVerseIssuer 3/server/services/ipfs.ts`

- Removed `mock_jwt` default and fake CID return values (`Qm_mock_*`).
- Added `requireJwt()` and enforced it in `uploadJSON` + `uploadFile`.
- Missing JWT now fails closed with explicit error:
  - `PINATA_JWT is required for IPFS uploads`
- Preserved general upload failure wrapping while allowing config error to bubble clearly.

### 4) CredVerseRecruiter SafeDate/WorkScore: removed stub evidence summaries
**Files:**
- `CredVerseRecruiter/server/services/safedate.ts`
- `CredVerseRecruiter/server/services/workscore.ts`

- Replaced stub text defaults (`SafeDate evidence stub`, `WorkScore evidence stub`).
- Added production hard-fail when `evidence.summary` missing:
  - `SafeDate evidence.summary is required in production`
  - `WorkScore evidence.summary is required in production`
- Non-production keeps non-stub neutral fallback text:
  - `SafeDate evidence not provided`
  - `WorkScore evidence not provided`

---

## Tests added/updated

### Added
- `BlockWalletDigi/tests/wallet-service-anchoring-policy.test.ts`
  - Verifies production fails closed when anchor service URL is missing.
- `BlockWalletDigi/tests/digilocker-production-policy.test.ts`
  - Verifies DigiLocker service throws in production when credentials are missing.
- `CredVerseIssuer 3/tests/ipfs-production-policy.test.ts`
  - Verifies IPFS upload fails when `PINATA_JWT` is missing.
- `CredVerseRecruiter/tests/evidence-summary-production-policy.test.ts`
  - Verifies SafeDate and WorkScore enforce evidence summary in production.

### Executed test commands
- `cd BlockWalletDigi && npm test -- tests/wallet-service-anchoring-policy.test.ts tests/digilocker-production-policy.test.ts`
- `cd "CredVerseIssuer 3" && npm test -- tests/ipfs-production-policy.test.ts`
- `cd CredVerseRecruiter && npm test -- tests/evidence-summary-production-policy.test.ts tests/safedate.test.ts tests/workscore.test.ts`

### Results
- All above targeted tests passed.

---

## Notes
- This pass intentionally targets production runtime fail-closed behavior for critical mock/stub paths.
- Non-production compatibility remains where useful for local development, but production now blocks unsafe mock execution on these prioritized surfaces.
