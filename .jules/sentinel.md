## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.

## 2024-03-24 - [IDOR in Team Management Endpoints]
**Vulnerability:** In `CredVerseIssuer 3/server/routes/team.ts`, `PUT /team/:id/role`, `PUT /team/:id/status`, and `DELETE /team/:id` methods were directly updating or deleting a team member based on `req.params.id` without validating if the team member belonged to the authenticated user's `tenantId`.
**Learning:** This is an Insecure Direct Object Reference (IDOR) vulnerability. A user from one tenant could pass the `id` of a team member from a different tenant and successfully update their role/status or delete them. This highlights the importance of always checking cross-tenant boundaries when performing mutations on resources referenced by ID.
**Prevention:** Always verify the ownership or tenant association of the resource being accessed or modified. Fetch the resource first, check if its `tenantId` matches the authenticated user's `tenantId`, and return a 404 (or 403) if it doesn't match before proceeding with any state-changing operations.
