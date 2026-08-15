## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.
## 2025-02-18 - [Missing Authorization Checks on Multitenant Resources]
**Vulnerability:** Found Insecure Direct Object Reference (IDOR) vulnerabilities in the `/team` routes of `CredVerseIssuer 3`. The `getTeamMember`, `updateTeamMember`, and `deleteTeamMember` endpoints fetched or modified resources based on `req.params.id` without checking if the resource belonged to the currently authenticated user's `tenantId`.
**Learning:** In a multi-tenant application, relying solely on IDs (e.g. `req.params.id`) to fetch, update, or delete resources allows attackers to access other tenants' data by guessing or manipulating the ID.
**Prevention:**
1. Always validate that the `tenantId` of the requested resource matches the authenticated user's `tenantId` (e.g., `member.tenantId === req.tenantId`).
2. Alternatively, include the `tenantId` in the database query conditions itself (e.g., `where({ id: req.params.id, tenantId: req.tenantId })`) to prevent IDOR by default.
