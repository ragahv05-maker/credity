## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.
## 2025-02-23 - [Insecure Direct Object Reference (IDOR) in Team Member Management]
**Vulnerability:** Endpoints for fetching, updating (role, status), and deleting team members in `CredVerseIssuer 3/server/routes/team.ts` used `storage.getTeamMember(req.params.id)` but failed to verify that the retrieved member's `tenantId` matched the authenticated user's `tenantId`.
**Learning:** Any multi-tenant resource must explicitly validate ownership or tenant boundaries. Simply fetching a resource by its ID allows an attacker to manipulate resources belonging to other tenants. This pattern was missing across multiple routes.
**Prevention:** Always validate `resource.tenantId === req.tenantId` (or equivalent authorization context) immediately after fetching the resource and before performing any actions or returning data.
