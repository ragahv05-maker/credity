## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.

## 2025-02-18 - [Predictable OTP Generation]
**Vulnerability:** The OTP service was using `Math.random()` to generate codes, which is not cryptographically secure and can lead to predictability attacks.
**Learning:** Always use cryptographically secure random number generators (like `crypto.randomInt()`) for generating sensitive values like OTPs or tokens.
**Prevention:** Use the `crypto` module's functions (e.g., `crypto.randomInt`, `crypto.randomBytes`) instead of `Math.random()` for security-critical random generation.
