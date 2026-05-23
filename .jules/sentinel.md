## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.
## 2025-02-18 - [Permissive CORS with Credentials]
**Vulnerability:** Express CORS configuration used `origin: true` as a fallback while `credentials: true` was active, effectively allowing any origin to make authenticated cross-origin requests.
**Learning:** Using `true` as a fallback origin is a critical security vulnerability when credentials (cookies, auth headers) are enabled, as it bypasses origin checks entirely and exposes the API to CSRF or data theft from malicious sites.
**Prevention:**
1. Always use a strict whitelist of allowed origins.
2. If a fallback is needed, use an explicit empty array `[]` or a function that returns an error for unknown origins to ensure strict enforcement.
