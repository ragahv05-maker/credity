# Phase C – Agent 1 (Auth + Identity Hardening)

## Scope completed

Objective: finalize production auth + identity hardening for wallet/mobile lane.

### 1) Apple JWKS + mobile Apple flow integration (end-to-end)

- Validated backend Apple token verification path is operational via JWKS-backed signature verification and auth endpoint contract.
- Validated mobile client Apple token exchange path (`/api/mobile/wallet/v1/auth/apple`) and session persistence behavior through tests.
- Confirmed end-to-end contract is green (backend + mobile unit/integration test layer).

### 2) PIN/session 30-day policy (API + mobile client)

- Validated API absolute session max-age policy via refresh rejection beyond 30 days.
- Validated PIN fallback flow remains functional (setup + verify).
- Confirmed mobile session refresh/restore logic and token rotation handling behavior through api client tests.

### 3) Residual identity edge-cases

- Hardened/validated liveness challenge-response hooks and route behavior.
- Hardened/validated anti-spoof handling in biometric verification path (negative-path enforced).
- Validated production policy guardrail around DigiLocker credentials in production mode.

---

## Commands run + results

### Wallet auth/identity tests

```bash
cd /Users/raghav/Desktop/credity/BlockWalletDigi
npm test -- tests/auth-apple-oauth.test.ts tests/auth-session-30day-policy.test.ts tests/auth-pin-fallback.test.ts tests/identity-face-match-accuracy.test.ts tests/identity-liveness-challenge-hooks.test.ts
```

Result:

- **5 files passed**
- **8 tests passed**
- No failures

### Mobile auth client tests

```bash
cd /Users/raghav/Desktop/credity/apps/mobile
npm test -- src/lib/api-client.test.ts
```

Result:

- **1 file passed**
- **4 tests passed**
- No failures

### Additional production-edge regressions

```bash
cd /Users/raghav/Desktop/credity/BlockWalletDigi
npm test -- tests/biometrics-encryption-workflow.test.ts tests/digilocker-production-policy.test.ts tests/identity-liveness-challenge-hooks.test.ts
```

Result:

- **3 files passed**
- **5 tests passed**
- No failures
- Observed expected negative-path logs (`anti_spoof_check_failed`) during spoof test scenario

---

## Changed files (auth/identity lane)

### Modified

- `BlockWalletDigi/server/routes/identity.ts`
- `BlockWalletDigi/server/services/biometrics-service.ts`
- `BlockWalletDigi/server/services/face-match-service.ts`
- `BlockWalletDigi/server/services/liveness-service.ts`
- `apps/mobile/src/lib/api-client.ts`
- `apps/mobile/src/lib/api-client.test.ts`
- `apps/mobile/src/screens/auth-screen.tsx`

### Added

- `BlockWalletDigi/tests/biometrics-encryption-workflow.test.ts`
- `BlockWalletDigi/tests/digilocker-production-policy.test.ts`
- `BlockWalletDigi/tests/identity-liveness-challenge-hooks.test.ts`

---

## Blockers / risks

- No execution blockers encountered in this lane.
- Non-blocking warning observed during vitest run:
  - `baseline-browser-mapping` data is stale (dependency freshness warning only).

## Summary

Auth + identity hardening lane is in a releasable state at test level for:

- Apple sign-in verification + mobile exchange path
- 30-day session policy enforcement and PIN fallback
- Identity anti-spoof and liveness challenge edge cases
- Production DigiLocker policy guardrail regression
