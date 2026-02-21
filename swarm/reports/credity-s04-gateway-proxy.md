# Credity Swarm S04 — credverse-gateway mobile proxy guardrails

## Scope completed

Focused only on `credverse-gateway` mobile proxy guardrails for:

- route allowlist hardening
- claims payload/query validation
- claims rate-limit verification
- proxy error mapping
- test strengthening

## Changes made

### 1) Route allowlist hardening

**File:** `credverse-gateway/server/routes/mobile-proxy.ts`

- Tightened subpath validation in `isSubpathAllowed`:
  - Rejects control characters (`\u0000-\u001F`)
  - Rejects backslashes (`\\`) to reduce path normalization bypass attempts
  - Existing checks retained (`.` / `..`, max length, prefix allowlist)

### 2) Claims payload/query validation hardening

**File:** `credverse-gateway/server/routes/mobile-proxy.ts`

- Added `isSafeClaimsQueryValue` and enforced query value types for claims routes.
  - Allows only scalar primitives: `string | number | boolean | null | undefined`
  - Rejects object-like query values (defensive parser abuse hardening)
- Existing validation retained and covered:
  - method allowlist (`GET`, `POST`)
  - max query keys (20)
  - max query value size (512 chars)
  - JSON-only POST content-type
  - object-only body
  - max body size (32 KB)
  - max top-level keys (100)

### 3) Error mapping improvement

**File:** `credverse-gateway/server/routes/mobile-proxy.ts`

- Extended proxy error mapping to inspect `err.cause?.code` in addition to `err.code`.
- Added timeout mapping support for undici-style timeout code:
  - `UND_ERR_CONNECT_TIMEOUT` → `504 Upstream timeout`
- Existing mappings retained:
  - `AbortError` → 504
  - `TypeError` → 502 Invalid upstream response
  - network unavailable codes (`ENOTFOUND`, `ECONNREFUSED`, `EHOSTUNREACH`, `ECONNRESET`) → 502

## Test suite strengthened

**File:** `credverse-gateway/server/routes/mobile-proxy.test.ts`

- Extended helper to allow custom fetch mocking per test.
- Added new coverage:
  1. Claims method/content-type guardrails (`405`, `415`)
  2. Claims query size guardrails (too many params, oversized value)
  3. Claims rate-limiting behavior (`429` + `Retry-After` after threshold)
  4. Upstream error mapping coverage (`ECONNREFUSED`, `AbortError`, `TypeError`)

## Validation run

Executed:

```bash
cd /Users/raghav/Desktop/credity/credverse-gateway
npm run test:proxy
```

Result:

- **13/13 tests passing**
- **0 failures**

## Notes

- Claims rate-limit buckets are in-memory (current design); tests use an explicit client IP to avoid cross-test noise.
- No unrelated modules/routes were modified.
