## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.

## 2025-04-24 - [Insecure Randomness in OTP]
**Vulnerability:** Found `Math.random()` being used to generate OTP codes. This is not a Cryptographically Secure Pseudo-Random Number Generator (CSPRNG).
**Learning:** Node's `Math.random()` creates predictable patterns. When used in security-sensitive scenarios like authentication or token generation, it opens the application to timing or pattern-guessing attacks.
**Prevention:** Always use Node's native `crypto` module (e.g., `crypto.randomInt()`, `crypto.randomBytes()`) for generating secure tokens, passwords, or OTPs. Note that when importing in TS, `import * as crypto from 'crypto';` is often necessary to avoid `TS1192` module errors.
