## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.

## 2025-05-12 - [Overly Permissive CORS Configuration]
**Vulnerability:** The CORS configuration in `packages/shared-auth/src/security.ts` used `true` as a fallback for the `origin` option while also having `credentials: true` enabled.
**Learning:** Using `origin: true` alongside `credentials: true` creates a critical security vulnerability, as it instructs the CORS middleware to reflect any requesting origin in the `Access-Control-Allow-Origin` header, bypassing CORS protections entirely and allowing any malicious website to make authenticated cross-origin requests.
**Prevention:**
1. Always use a strict whitelist for allowed origins when `credentials: true` is active.
2. If a fallback is necessary, use an empty array `[]` (deny-all) instead of `true` to ensure the application defaults to a secure state.
