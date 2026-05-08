## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.

## 2025-02-18 - [Insecure Randomness for Security Primitives]
**Vulnerability:** Weak PRNG (`Math.random()`) was being used to generate OTPs, which are sensitive security tokens.
**Learning:** `Math.random()` is not cryptographically secure and is predictable. In this codebase, it was used widely, likely due to a lack of security reviews of random generation functions. Predictability allows attackers to guess valid OTPs, bypassing multi-factor authentication checks.
**Prevention:** Always use Node.js's native `crypto` module (e.g., `crypto.randomInt()`, `crypto.randomBytes()`) for generating sensitive material like OTPs, tokens, backup codes, or cryptographic keys instead of `Math.random()`.
