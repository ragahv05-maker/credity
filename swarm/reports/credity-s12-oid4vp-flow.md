# Credity Swarm S12 — OID4VP wallet-binding verification flow improvements

## Scope

Task: Design and implement minimal robust OID4VP wallet-binding verification flow improvements in `/Users/raghav/Desktop/credity` with integrated test stubs (preferably real tests).

## What I changed

### 1) Hardened OID4VP request creation endpoint

**File:** `CredVerseRecruiter/server/routes/verification.ts`

Updated `POST /api/v1/oid4vp/requests` to:

- Validate `purpose` (must be non-empty string, max 128 chars)
- Validate `state` when provided (string, 1..512 chars)
- Trim and persist `purpose`
- Return `expires_at` derived from `OID4VP_REQUEST_TTL_MS`

This adds basic input hygiene and explicit request lifetime signaling.

---

### 2) Added wallet-binding checks in OID4VP response processing

**File:** `CredVerseRecruiter/server/routes/verification.ts`

Updated `POST /api/v1/oid4vp/responses` to enforce:

- `request_id` is required and must exist
- One of `vp_token`, `jwt`, or `credential` must be present
- If JWT/VP token is present, decoded payload `nonce` must match stored request nonce
- If request had `state`, response `state` (or token payload state) must match

Flow behavior improvements:

- Request is now consumed **only after successful verification**, not pre-emptively
- Invalid bindings fail fast with `400` (`nonce mismatch`, `state mismatch`, etc.)

This is the core wallet-binding robustness change (nonce/state correlation + safer consume semantics).

---

### 3) Integrated OID4VP binding tests (not just stubs)

**File:** `CredVerseRecruiter/tests/oid4vp-wallet-binding.test.ts`

Added focused tests covering:

- Missing `request_id` is rejected
- Nonce mismatch in `vp_token` is rejected
- State mismatch is rejected
- `request_id` becomes one-time-use only after success (second submission => `unknown request_id`)

Test run executed:

- `npm test -- oid4vp-wallet-binding.test.ts`
- Result: **4 passed**

## Design notes / rationale

- Kept changes minimal and local to existing OID4VP routes
- Reused existing request cache + persistence primitives instead of introducing new stores
- Did not add heavy JOSE signature verification at this layer (out of minimal-scope change); enforced nonce/state anti-replay binding first

## Files modified

- `CredVerseRecruiter/server/routes/verification.ts`
- `CredVerseRecruiter/tests/oid4vp-wallet-binding.test.ts`

## Follow-up patch plan (recommended)

1. Enforce JWT signature + `aud` verification for `vp_token` (issuer/verifier audience binding)
2. Add replay fingerprinting for OID4VP responses (similar to proofs replay cache)
3. Emit structured OID4VP error codes for clients (`OID4VP_NONCE_MISMATCH`, `OID4VP_STATE_MISMATCH`, etc.)
4. Add conformance-style test vectors for malformed tokens and expired requests
