## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.
## 2025-02-18 - [Insecure Direct Object Reference (IDOR) in Team Management]
**Vulnerability:** Team member routes (`GET /team/:id`, `PUT /team/:id/role`, `PUT /team/:id/status`, `DELETE /team/:id`) allowed any authenticated user to retrieve, modify, or delete team members belonging to any other tenant by simply providing the `id`, as the code only checked if the member existed but not if the `tenantId` matched the requester's `tenantId`.
**Learning:** Endpoints managing multi-tenant resources must explicitly validate that the requested resource's `tenantId` matches the authenticated user's `tenantId` to prevent Insecure Direct Object Reference (IDOR) vulnerabilities and authorization bypasses.
**Prevention:** Always verify `resource.tenantId === req.tenantId` for any endpoint that accesses a resource by ID.
