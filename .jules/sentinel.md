## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.

## 2025-02-18 - [Overly Permissive CORS Policy]
**Vulnerability:** The CORS `origin` parameter was set to a fallback of `true` while `credentials: true` was enabled. This causes the `cors` package to reflect the request origin back, allowing cross-origin requests from any site to be authenticated.
**Learning:** `origin: true` is dangerous in combination with `credentials: true`. It bypasses the protection CORS aims to provide, acting as a wildcard origin reflecting the requester.
**Prevention:** Use an explicit whitelist array or `[]` as a fallback instead of a generic boolean `true`.
