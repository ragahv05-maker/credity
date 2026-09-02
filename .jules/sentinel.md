## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.
## 2025-02-18 - [Insecure Direct Object Reference in Team API]
**Vulnerability:** IDOR in the team member management endpoints (`GET /team/:id`, `PUT /team/:id/role`, `PUT /team/:id/status`, `DELETE /team/:id`) where any authenticated user could access, modify, or delete team members from other tenants simply by knowing their IDs, since `tenantId` was not validated.
**Learning:** In a multi-tenant system, authentication alone is insufficient for authorization. Object-level access control must be explicitly enforced by verifying that the object's `tenantId` matches the requester's `tenantId`. Returning 404 instead of 403 prevents leaking the existence of IDs across boundaries.
**Prevention:**
1. Always validate `object.tenantId === req.tenantId` for any endpoint receiving an `id` path parameter.
2. Ensure secure failing by returning `404 Not Found` for authorization mismatches on direct object lookups.
