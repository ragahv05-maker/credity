# Mobile Apple Auth Real Flow — Implementation Report

## Scope
Implemented real Apple Sign-In on mobile by replacing the placeholder TODO in `apps/mobile/src/screens/auth-screen.tsx`, wiring it to the backend Apple auth endpoint already present, and validating behavior with tests.

## Changes made

### 1) Real Apple auth flow in Auth screen
**File:** `apps/mobile/src/screens/auth-screen.tsx`

- Added `expo-apple-authentication` integration.
- Replaced placeholder `onAppleSignIn` with actual flow:
  - Enforces iOS-only behavior.
  - Enforces Holder-only behavior (`role === 'holder'`) since backend endpoint issues holder tokens.
  - Checks `AppleAuthentication.isAvailableAsync()`.
  - If available, calls `AppleAuthentication.signInAsync()` with scopes:
    - `FULL_NAME`
    - `EMAIL`
  - Exchanges returned `identityToken` with backend via API client.
  - Handles user-cancel (`ERR_REQUEST_CANCELED`) silently.
  - Displays alert on actionable failures.
- Added fallback behavior when native Apple auth is unavailable:
  - Opens backend Apple auth page in browser: `${BACKEND_URL}/api/v1/auth/apple`.

### 2) API client endpoint wiring for Apple token exchange
**File:** `apps/mobile/src/lib/api-client.ts`

- Added `loginWithAppleIdentityToken(identityToken: string, state?: string)`:
  - Validates token presence.
  - Sends POST to holder endpoint: `v1/auth/apple` via mobile proxy.
  - Uses `skipAuth: true` and no auth-retry loop for initial sign-in.
  - Extracts and validates `tokens.accessToken` + `tokens.refreshToken`.
  - Stores refresh token in secure vault and updates holder session in Zustand store.
- Keeps token handling consistent with existing login/register flows.

### 3) Dependency addition
**File:** `apps/mobile/package.json`

- Added:
  - `expo-apple-authentication: ~7.1.3`
- Updated lockfile:
  - `apps/mobile/package-lock.json`

### 4) Tests added (feasible unit coverage)
**File:** `apps/mobile/src/lib/api-client.test.ts`

- Added test for Apple exchange path:
  - Verifies request hits `/api/mobile/wallet/v1/auth/apple`.
  - Verifies POST body includes `identityToken`.
  - Verifies holder session receives access/refresh tokens after exchange.

## Validation run
Executed in `apps/mobile`:

1. `npm test -- src/lib/api-client.test.ts` ✅
   - 4 tests passed.
2. `npm run typecheck` ✅
   - TypeScript compile clean.

## Notes / behavior details
- Apple auth button remains iOS-only in UI.
- For non-holder roles, user gets a clear message that Apple auth is holder-only currently.
- Native auth unavailability falls back to browser-based backend initiation.
- No identity token persistence was added; only access/refresh tokens are retained using existing secure patterns.
