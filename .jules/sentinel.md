## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.
## 2025-02-18 - [Insecure CORS Fallback Configuration]
**Vulnerability:** The shared Express security middleware (`packages/shared-auth/src/security.ts`) used a fallback of `origin: true` alongside `credentials: true`.
**Learning:** Setting `origin: true` automatically reflects any requesting origin back in the `Access-Control-Allow-Origin` header. When combined with `credentials: true`, this creates a critical vulnerability allowing any malicious third-party site to make authenticated cross-origin requests to the API, opening the door for CSRF and data leakage.
**Prevention:** Always use strict origin checking. If an explicit whitelist is unavailable via configuration or environment variables, use an empty array `[]` or explicitly `false` as a fallback, rather than `true`.
