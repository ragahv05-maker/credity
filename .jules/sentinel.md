## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.

## 2024-09-06 - Fix IDOR and Information Disclosure in Template Designs
**Vulnerability:** The `/template-designs/:id` endpoints allowed cross-tenant requests to infer the existence of template designs belonging to other tenants by returning a `403 Forbidden` instead of `404 Not Found`. Additionally, the GET endpoint lacked authorization checks entirely.
**Learning:** Returning a `403 Forbidden` for cross-tenant mismatches leaks the existence of valid resource IDs in other tenants' environments, leading to Information Disclosure and Insecure Direct Object Reference (IDOR) vulnerabilities.
**Prevention:** Always validate that the requested resource's `tenantId` matches the authenticated user's `tenantId` and securely fail by returning a `404 Not Found` instead of `403 Forbidden` for cross-tenant mismatches.
