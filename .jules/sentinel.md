## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.

## 2024-07-15 - Insecure OTP Generation
**Vulnerability:** OTP codes were generated using `Math.random()`, which is not cryptographically secure and can be predictable.
**Learning:** Even simple numerical OTPs require a CSPRNG to prevent attackers from predicting the codes.
**Prevention:** Always use Node.js `crypto.randomInt()` or equivalent secure random number generators for security-sensitive values like OTPs.
