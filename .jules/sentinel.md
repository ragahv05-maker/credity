## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.
## 2024-05-24 - Missing Authorization Check on Team Member Endpoints (IDOR)
**Vulnerability:** Team member GET, PUT, and DELETE endpoints used `storage.getTeamMember(req.params.id)` (or straight update/delete) without checking if the returned member belonged to the authenticated user's `tenantId`.
**Learning:** Endpoints managing multi-tenant resources must explicitly validate that the requested resource's `tenantId` matches the authenticated user's `tenantId` (`member.tenantId === req.tenantId`) to prevent Insecure Direct Object Reference (IDOR) vulnerabilities.
**Prevention:** Always verify resource ownership against the current user's session/tenant ID after fetching by ID, or incorporate the `tenantId` directly into the database query.
