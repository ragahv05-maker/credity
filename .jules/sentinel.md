## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.

## 2025-02-18 - [Insecure PRNG for Security Tokens]
**Vulnerability:** Used `Math.random()` to generate Two-Factor Authentication (2FA) backup codes.
**Learning:** `Math.random()` is a predictable pseudo-random number generator and should never be used for generating cryptographic materials, such as 2FA backup codes, passwords, or session tokens.
**Prevention:** Always use cryptographically secure random number generators (CSPRNG), such as `crypto.randomBytes` or `crypto.randomInt` from the Node.js `crypto` module, when creating security-sensitive tokens.
