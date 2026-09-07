## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.
## 2024-09-07 - IDOR Vulnerability in Team API
**Vulnerability:** The Team API endpoints (`/team/:id`, `/team/:id/role`, `/team/:id/status`, and `DELETE /team/:id`) lacked authorization checks to verify if the requested team member belonged to the authenticated user's tenant.
**Learning:** This allowed users to access or modify team members belonging to other tenants. Returning a `404 Not Found` instead of `403 Forbidden` for cross-tenant resource requests prevents leaking the existence of valid resource IDs.
**Prevention:** Always verify ownership or tenant association when retrieving resources by ID before performing any operations on them. Fail securely with a 404 to obscure resource existence.
