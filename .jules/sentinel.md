## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.

## 2025-02-18 - [Missing Authorization Checks (IDOR)]
**Vulnerability:** Found multiple endpoints in `CredVerseIssuer 3/server/routes/team.ts` managing multi-tenant resources (team members) that retrieved or modified data using only the user-provided `id` from URL params, without verifying if the resource belonged to the authenticated user's `tenantId`.
**Learning:** In a multi-tenant architecture, simply authenticating the request (e.g. via `apiKeyMiddleware`) is insufficient. Endpoints must explicitly validate that the requested resource's `tenantId` matches the authenticated user's `tenantId` to prevent Insecure Direct Object Reference (IDOR) vulnerabilities, where a user could view or manipulate another tenant's data.
**Prevention:**
1. Always retrieve the `tenantId` from the authenticated request object.
2. Fetch the target resource by its `id`.
3. Check `resource.tenantId === req.tenantId`. If they do not match, return a generic 404 Not Found error (to avoid information leakage).
