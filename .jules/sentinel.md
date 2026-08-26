## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.

## 2025-02-18 - [Cross-Tenant IDOR in Team Member Management]
**Vulnerability:** The team member endpoints (`GET /team/:id`, `PUT /team/:id/role`, `PUT /team/:id/status`, `DELETE /team/:id`) failed to validate if the targeted team member belonged to the authenticated user's tenant.
**Learning:** Multi-tenant applications must explicitly check ownership boundaries for every resource access. Relying solely on the presence of a valid resource ID allows authenticated users to manipulate resources across tenants (Insecure Direct Object Reference).
**Prevention:** Always include a check verifying that `resource.tenantId === req.tenantId` for multi-tenant entities before allowing read, update, or delete operations. Fail securely with a 404 to avoid exposing valid resource IDs.
