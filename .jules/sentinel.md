## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.
## 2024-05-24 - Cross-Tenant Access Control (IDOR) Fix
**Vulnerability:** Endpoints managing multi-tenant resources (like team members) did not explicitly validate that the requested resource's `tenantId` matched the authenticated user's `tenantId` (e.g., `member.tenantId === req.tenantId`), exposing them to Insecure Direct Object Reference (IDOR) attacks.
**Learning:** In a multi-tenant system, simply verifying that a resource exists is insufficient. You must verify that the resource *belongs* to the requesting tenant. Missing this check allows an authenticated user in one tenant to access, modify, or delete resources belonging to another tenant by directly referencing their IDs. The endpoints were vulnerable because they only checked `if (!member)` and missing `member.tenantId !== tenantId`.
**Prevention:** Always implement explicit cross-tenant checks on multi-tenant endpoints. Ensure the endpoint fails securely by returning a `404 Not Found` instead of a `403 Forbidden` for cross-tenant mismatches to avoid leaking the existence of valid resource IDs in other tenants' environments.
