## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.

## 2025-02-18 - [Overly Permissive CORS Policy]
**Vulnerability:** The CORS policy configuration used `origin: config.allowedOrigins || process.env.ALLOWED_ORIGINS?.split(",") || true` while `credentials: true` was active.
**Learning:** Using `origin: true` instructs the `cors` middleware to reflect any incoming `Origin` header back in the `Access-Control-Allow-Origin` header. When combined with `credentials: true`, this completely defeats the purpose of CORS by allowing any malicious site to make cross-origin authenticated requests (e.g., passing cookies/sessions).
**Prevention:** Never use `true` as a fallback for the CORS `origin` setting when credentials are enabled. Always default to an empty array `[]` or a strict whitelist of known safe origins to ensure secure-by-default behavior if explicit configuration is missing.
