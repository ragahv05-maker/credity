## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.

## 2025-02-18 - Missing IDOR protection in team members endpoints
**Vulnerability:** The endpoints `/team/:id`, `/team/:id/role`, `/team/:id/status`, and `DELETE /team/:id` in `CredVerseIssuer 3/server/routes/team.ts` were missing authorization checks to ensure the team member being accessed or modified belonged to the current user's tenant.
**Learning:** Endpoints managing multi-tenant resources (like team members) must explicitly validate that the requested resource's `tenantId` matches the authenticated user's `tenantId` to prevent Insecure Direct Object Reference (IDOR) vulnerabilities. Just retrieving the resource by ID is not enough.
**Prevention:** Always verify the `tenantId` of a resource retrieved by ID matches `(req as any).tenantId` before returning or modifying the resource.
