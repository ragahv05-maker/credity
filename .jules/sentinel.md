## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.

## 2025-03-01 - [Insecure Random Number Generation]
**Vulnerability:** Found `Math.random()` being used to generate OTPs, 2FA backup codes, and temporary OAuth passwords.
**Learning:** `Math.random()` is not cryptographically secure and can be predicted. Security-sensitive values must use a CSPRNG (Cryptographically Secure Pseudo-Random Number Generator).
**Prevention:** Always use Node.js's native `crypto` module (e.g., `crypto.randomInt()`, `crypto.randomBytes()`) for generating secrets, tokens, or any security-sensitive random values.
