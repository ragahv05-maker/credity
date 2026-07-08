## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.

## 2025-07-08 - [Insecure Math.random() usage for Security Secrets]
**Vulnerability:** Predictable random numbers from `Math.random()` were used to generate passwords, OTPs, and 2FA backup codes.
**Learning:** Using `Math.random()` in security-sensitive contexts is a critical vulnerability as it can be predicted, leading to compromised accounts and secrets.
**Prevention:** Always use cryptographically secure random number generators (e.g., `crypto.randomBytes()` or `crypto.randomInt()`) from the built-in `crypto` module for any security-related random generation.
