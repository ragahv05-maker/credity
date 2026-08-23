## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.

## 2024-11-20 - Prevent Cross-Tenant IDOR Vulnerabilities
**Vulnerability:** Insecure Direct Object Reference (IDOR) found in `/team/:id` endpoints where any authenticated user could access, modify, or delete team members from other tenants simply by guessing the resource ID.
**Learning:** The multi-tenant architecture relies on a top-level `tenantId` bound to the authenticated request, but some endpoints retrieved data from the database by ID alone without re-verifying that the resource's `tenantId` matched the caller's `tenantId`.
**Prevention:** Always validate that `resource.tenantId === req.tenantId` for multi-tenant resources. To prevent leaking valid resource IDs across tenants, return `404 Not Found` rather than `403 Forbidden` on a mismatch.
