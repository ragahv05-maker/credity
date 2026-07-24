## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.
## 2024-07-24 - SQL Injection Risk via Unvalidated Table Name Configuration
**Vulnerability:** The `tableName` in `PostgresStateStore` was concatenated directly into queries without sanitization.
**Learning:** Dynamic DDL/DML table names cannot be parameterized via standard `$1` bindings and must be explicitly validated against strict alphanumeric regexes.
**Prevention:** Always validate user-provided structural identifiers (table/column names) against a strict allowlist regex (e.g., `/^[a-zA-Z0-9_]+$/`) prior to concatenation.
