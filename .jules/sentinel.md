## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.
## 2025-10-27 - [Insecure Randomness in Security Features]
**Vulnerability:** Weak PRNG (`Math.random()`) used for generating 2FA backup codes and transaction IDs.
**Learning:** Using `Math.random()` for any security-sensitive operation (like generating secrets, tokens, or identifiers used in security contexts) makes them predictable and vulnerable to attack.
**Prevention:** Always use cryptographically secure pseudo-random number generators (CSPRNG), such as Node.js `crypto` module (`crypto.randomInt`, `crypto.randomBytes`), for generating security-related random values.
