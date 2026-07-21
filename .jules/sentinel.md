## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.
## 2024-07-21 - [Insecure Randomness for Security Tokens]
**Vulnerability:** Weak random number generation (`Math.random()`) used for backup codes in `CredVerseIssuer 3/server/services/two-factor.ts`.
**Learning:** `Math.random()` is not cryptographically secure and predictable. Security-sensitive values must use cryptographically secure random number generators (CSPRNG).
**Prevention:** Always use `crypto.randomInt()` or `crypto.randomBytes()` instead of `Math.random()` when generating secrets, tokens, or security codes.
