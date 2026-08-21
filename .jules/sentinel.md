## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.
## 2025-02-18 - [Insecure Direct Object Reference (IDOR) in Multi-tenant Endpoints]
**Vulnerability:** Endpoints managing multi-tenant resources (like team members) were missing explicit `tenantId` validation, allowing cross-tenant access to resources.
**Learning:** Multi-tenant architectures require explicit authorization checks ensuring the requested resource's `tenantId` matches the authenticated user's `tenantId`.
**Prevention:** Always validate `resource.tenantId === req.tenantId` for multi-tenant resources, and fail securely with a `404 Not Found` to prevent leaking valid resource IDs.
