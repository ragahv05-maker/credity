# Credity Swarm S01 — BlockWalletDigi security/authz/reliability hardening

## Scope

Focused on **BlockWalletDigi** route hardening for:

- missing auth checks
- user binding (preventing userId spoofing / IDOR)
- error response consistency (status + machine-readable `code`)

## Audit findings

High-risk patterns found in wallet-facing APIs:

1. Multiple endpoints accepted `userId` from query/body with insecure fallback to `1`.
2. Several wallet/compliance/inbox/DigiLocker operations had no JWT auth middleware.
3. Inconsistent error payloads (`{ error }` only) made client handling brittle and reduced observability.
4. Backup restore path could restore payloads without checking authenticated-owner binding.

## Implemented fixes

### 1) Added centralized authz helper

**File:** `BlockWalletDigi/server/utils/authz.ts`

- Added `getAuthenticatedUserId(req, res)`
- Added `resolveBoundUserId(req, res, options)` to enforce:
  - authenticated user presence
  - optional `userId` validation if supplied
  - strict mismatch rejection (`403 AUTH_USER_MISMATCH`)

### 2) Hardened wallet routes

**File:** `BlockWalletDigi/server/routes/wallet.ts`

- Added `authMiddleware` to private wallet endpoints:
  - `POST /wallet/init`
  - `GET /wallet/status`
  - `POST /did/create`
  - `POST /wallet/backup`
  - `POST /wallet/restore`
- Stopped trusting body/query `userId`; now use token identity.
- Added backup ownership check on restore:
  - rejects with `403 BACKUP_USER_MISMATCH` if backup belongs to another user.
- Standardized key failures to include `code` values.

### 3) Hardened compliance routes

**File:** `BlockWalletDigi/server/routes/compliance.ts`

- Added `authMiddleware` to all user-scoped compliance endpoints.
- Replaced body/query-driven user selection with authenticated user binding.
- Added explicit auth/user validation error codes (e.g. `AUTH_USER_MISMATCH`, `CONSENT_*`, `DATA_*`).
- Kept CERT-In incident endpoints behavior intact (public in current design), but made error codes consistent.

### 4) Hardened notifications/inbox routes

**File:** `BlockWalletDigi/server/routes/notifications.ts`

- Added `authMiddleware` and authenticated identity binding for inbox, webhook registration, notifications, and activity endpoints.
- Removed body/query-driven wallet identity control from protected handlers.
- Added consistent error `code` fields.
- Left `/push` issuer-facing flow unauthenticated (existing integration behavior), but improved validation error coding.

### 5) Hardened DigiLocker routes

**File:** `BlockWalletDigi/server/routes/digilocker.ts`

- Added `authMiddleware` + token-bound user identity for user-scoped DigiLocker actions:
  - auth URL, status, documents, import, import-all, disconnect, demo connect.
- Kept OAuth callback public (required by OAuth redirect flow).
- Added consistent error `code` payloads.

## Tests updated/added

### Updated

**File:** `BlockWalletDigi/tests/compliance.test.ts`

- Added auth route mount + register/login flow.
- Updated protected compliance calls to use bearer token.
- Removed dependence on user-supplied `userId` for protected routes.

### Added

**File:** `BlockWalletDigi/tests/wallet-hardening.test.ts`

- Verifies `GET /wallet/status` requires auth (`401`).
- Verifies compliance user mismatch is rejected (`403` + `AUTH_USER_MISMATCH`).

## Validation run

Executed in `BlockWalletDigi`:

- `npm run check` ✅
- `npm test` ✅
  - Result: **11 test files passed, 24 tests passed**

## Changed files

- `BlockWalletDigi/server/utils/authz.ts` (new)
- `BlockWalletDigi/server/routes/wallet.ts`
- `BlockWalletDigi/server/routes/compliance.ts`
- `BlockWalletDigi/server/routes/notifications.ts`
- `BlockWalletDigi/server/routes/digilocker.ts`
- `BlockWalletDigi/tests/compliance.test.ts`
- `BlockWalletDigi/tests/wallet-hardening.test.ts` (new)

## Notes

- This pass intentionally focused on wallet-adjacent critical paths and identity binding vulnerabilities.
- There are additional legacy/demo routes in other modules that still rely on query/body `userId` and may need similar treatment in subsequent swarm tasks.
