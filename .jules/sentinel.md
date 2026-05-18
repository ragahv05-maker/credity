## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.

## 2025-02-18 - [Overly Permissive CORS Origin Reflection]
**Vulnerability:** The CORS configuration in `shared-auth` used an insecure fallback `origin: ... || true` combined with `credentials: true`. This causes the server to dynamically reflect any requested origin back in the `Access-Control-Allow-Origin` header, allowing cross-origin authenticated requests from arbitrary malicious domains.
**Learning:** Setting `origin: true` in the Express `cors` middleware is dangerous because it essentially acts as a wildcard (`*`) while circumventing the browser's block on `*` with `credentials: true`. Default configurations must "fail closed".
**Prevention:**
1. Never use `true` as a fallback for the CORS `origin` property when `credentials: true` is enabled.
2. Use an empty array `[]` as the fallback to ensure requests are blocked unless the origin is explicitly whitelisted.
