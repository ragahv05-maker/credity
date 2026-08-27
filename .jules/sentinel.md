## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.

## 2025-02-27 - [IDOR resulting in 403 instead of 404]
**Vulnerability:** When a user requested a resource (like a credential or a template) that belonged to another tenant, the application returned a 403 Forbidden instead of a 404 Not Found. This leaked the existence of the resource ID in other tenants' environments.
**Learning:** Returning 403 Forbidden for cross-tenant mismatches leaks information about valid resource IDs across the platform.
**Prevention:** For multi-tenant resources, always return a 404 Not Found when the requested resource's tenantId does not match the authenticated user's tenantId.
