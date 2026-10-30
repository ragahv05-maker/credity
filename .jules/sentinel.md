## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.

## 2024-10-30 - Fix overly permissive CORS configuration
**Vulnerability:** The CORS configuration in `packages/shared-auth/src/security.ts` fell back to `origin: true` when `ALLOWED_ORIGINS` was not set, reflecting the request's origin and allowing any domain to make authenticated cross-origin requests.
**Learning:** Defaulting to `true` in CORS configuration completely nullifies CORS protection, as it instructs the browser to permit cross-origin requests from whatever origin requested it. Combined with `credentials: true`, this creates a severe security risk where attackers can execute unauthorized authenticated actions via CSRF-like techniques from malicious domains.
**Prevention:** Never use `true` as a fallback for the `origin` property in CORS middleware. Always enforce a strict allowlist of origins or default to `false` (blocking all cross-origin requests by default) to ensure security is opt-in, not opt-out.
