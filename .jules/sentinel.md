## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.

## 2025-03-05 - [Insecure Direct Object Reference in Cross-Tenant Access]
**Vulnerability:** Endpoints managing multi-tenant resources (like team members) did not explicitly validate that the requested resource's `tenantId` matches the authenticated user's `tenantId`, leading to IDOR.
**Learning:** It is crucial to validate `tenantId` (e.g., `member.tenantId === req.tenantId`) to prevent cross-tenant access. Additionally, these mismatch errors should return `404 Not Found` rather than `403 Forbidden` to avoid leaking the existence of valid resource IDs in other tenants' environments.
**Prevention:** Ensure explicit `tenantId` checks in all tenant-specific routes and consistently return 404 for mismatches to hide resource existence.
