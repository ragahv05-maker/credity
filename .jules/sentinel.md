## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.
## 2025-02-24 - Missing Authorization (IDOR) on Team Management Routes
**Vulnerability:** The endpoints `GET /team/:id`, `PUT /team/:id/role`, `PUT /team/:id/status`, and `DELETE /team/:id` in `CredVerseIssuer 3/server/routes/team.ts` lacked authorization checks to verify if the requested team member belonged to the authenticated tenant.
**Learning:** Even if a route is protected by an `apiKeyMiddleware` or similar that extracts `tenantId`, fetching a database record by ID without explicitly asserting `record.tenantId === req.tenantId` creates an IDOR vulnerability, allowing cross-tenant data access or modification. This issue was already mitigated correctly in `students.ts` but missed in `team.ts`.
**Prevention:** Always scope database queries or explicit validation checks using both the resource ID and the requesting user's `tenantId` / context, rather than trusting the object ID blindly.
