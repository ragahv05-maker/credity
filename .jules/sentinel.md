## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.

## 2025-02-18 - [Over-permissive CORS fallback vulnerability]
**Vulnerability:** A fallback condition for `cors` configuration in `packages/shared-auth/src/security.ts` defaulted the `origin` array to `true` (`origin: config.allowedOrigins || process.env.ALLOWED_ORIGINS?.split(",") || true`). Combined with `credentials: true`, this allowed any requesting origin to send and read authenticated cross-origin requests, as the server reflected whatever origin was provided.
**Learning:** Using `true` as a fallback origin configuration in Express/CORS with `credentials: true` opens the application to severe cross-origin security flaws, negating the purpose of CORS. A default permissive state is dangerous; an unconfigured origin array should fallback to an empty array (`[]`) to block unauthorized cross-origin requests by default.
**Prevention:**
1. Never use `origin: true` in conjunction with `credentials: true`.
2. Always use an explicit whitelist or fallback to a closed state (`[]`) for CORS origin configuration.
