## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.
## 2025-02-18 - [Missing Authorization Checks in Multi-Tenant Endpoints]
**Vulnerability:** IDOR vulnerability in `team.ts` endpoints (PUT, DELETE) allowed cross-tenant access to modify or delete team members because `tenantId` ownership was not verified after fetching the record.
**Learning:** In multi-tenant applications, fetching a record by ID is insufficient. Every endpoint that modifies or deletes a resource must explicitly verify that `resource.tenantId === req.tenantId`.
**Prevention:**
1. Implement a shared data access layer that automatically filters by `tenantId`.
2. Ensure all single-resource endpoints validate ownership before modification.
