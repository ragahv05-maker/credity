## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.

## 2026-04-17 - [Insecure Randomness for OTP generation]
**Vulnerability:** OTP code was generated using Math.random() which is predictable and not cryptographically secure.
**Learning:** Math.random() should never be used for security sensitive operations like token or OTP generation.
**Prevention:**
1. Always use a cryptographically secure pseudo-random number generator (CSPRNG) like crypto.randomInt or crypto.randomBytes from the built-in Node.js crypto module for security tokens, passwords, and OTPs.
