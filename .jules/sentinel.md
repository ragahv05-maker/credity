## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.

## 2025-02-20 - [Insecure Random Number Generation]
**Vulnerability:** Used `Math.random()` to generate secure OTP codes, making OTP tokens predictable and vulnerable to brute-force attacks.
**Learning:** `Math.random()` is not a cryptographically secure pseudo-random number generator (CSPRNG). Using it for security-sensitive tokens (like OTPs, passwords, session IDs) allows attackers to predict future outputs by observing past ones.
**Prevention:** Always use Node.js's built-in `crypto` module (e.g., `crypto.randomInt()`, `crypto.randomBytes()`) or a dedicated cryptographic library for generating security tokens or secrets.
