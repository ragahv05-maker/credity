## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.

## 2025-02-18 - [IDOR in Multi-Tenant Endpoints]
**Vulnerability:** Endpoints managing multi-tenant resources (like team members) did not explicitly validate that the requested resource's `tenantId` matched the authenticated user's `tenantId`.
**Learning:** Relying solely on `params.id` without checking the owner's `tenantId` creates an Insecure Direct Object Reference (IDOR) vulnerability, allowing users from one tenant to read, modify, or delete resources belonging to another tenant.
**Prevention:** Always check that `resource.tenantId === req.tenantId` for multi-tenant resources, and return a generic 404 Not Found (instead of 403 Forbidden) on mismatch to prevent leaking valid resource IDs.
