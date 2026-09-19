## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.
## 2023-09-19 - [IDOR in Team Management Endpoints]
**Vulnerability:** Insecure Direct Object Reference (IDOR) across GET, PUT, and DELETE /team/:id routes allowing cross-tenant modifications.
**Learning:** When retrieving or modifying resources by ID, checking existence isn't enough; must always verify the resource's parent tenantId matches the requesting user's tenantId. Additionally, responding with a 404 instead of 403 securely obfuscates whether a resource exists for attackers iterating over IDs.
**Prevention:** Standardize authorization checks in route handlers and ensure operations like 'update' or 'delete' confirm ownership before executing.
