## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.

## 2025-05-09 - [Insecure Random Generation for OTP]
**Vulnerability:** OTP codes were being generated using `Math.random()`, which is a weak, non-cryptographic pseudo-random number generator, making the codes predictable and vulnerable to attack.
**Learning:** Security-sensitive numbers like OTPs, session IDs, and tokens must always use cryptographically secure random number generation (`crypto.randomInt` or `crypto.randomBytes`).
**Prevention:**
1. Always use Node.js's native `crypto` module for security-sensitive values instead of `Math.random()`.
