## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.
## 2024-05-24 - Missing Authorization Checks (IDOR) on Team Endpoints
**Vulnerability:** Team member endpoints allowed access, modification, and deletion of multi-tenant resources using only the resource ID, without verifying the tenant ownership.
**Learning:** Relying solely on a resource's ID and API key authentication without checking if the resource belongs to the authenticated user's tenant leads to Insecure Direct Object Reference (IDOR) vulnerabilities.
**Prevention:** Always explicitly validate that the requested resource's `tenantId` matches the authenticated user's `tenantId` (e.g., `member.tenantId === req.tenantId`) when managing multi-tenant resources.
