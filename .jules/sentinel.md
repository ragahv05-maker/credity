## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.

## 2025-02-18 - [Insecure Randomness in Security Credentials]
**Vulnerability:** 2FA backup codes in `CredVerseIssuer 3/server/services/two-factor.ts` were being generated using `Math.random()`, which is not cryptographically secure and could lead to predictable bypass credentials.
**Learning:** Even though generating strings looks like standard JS, when creating security-sensitive credentials (like backup codes, OTPs, or tokens), `Math.random()` must never be used due to its deterministic pseudo-random number generator (PRNG) implementation.
**Prevention:** Always use Node.js's native `crypto` module (e.g., `crypto.randomInt()` or `crypto.randomBytes()`) for generating any security-related random values.
