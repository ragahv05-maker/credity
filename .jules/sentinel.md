## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.

## 2025-10-23 - [SSRF via Unvalidated URL Fetch]
**Vulnerability:** The `/verify/link` endpoint in CredVerseRecruiter used `fetch()` directly on a user-provided URL without any validation, allowing Server-Side Request Forgery (SSRF) against internal services and metadata endpoints (e.g. 169.254.169.254).
**Learning:** Never trust user-provided URLs when making server-side outbound requests. Always validate the protocol and block requests to internal networks, loopback addresses, and cloud metadata IPs to prevent SSRF in credential verification or importing flows.
**Prevention:**
1. Validate the URL structure and enforce strict HTTP/HTTPS protocols.
2. Implement an `isAllowedUrl` check to filter out internal IPs and `localhost` before executing the `fetch()`.
