## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.

## 2024-05-11 - [Insecure Random Number Generation for Security Features]
**Vulnerability:** The `Math.random()` function was used to generate 6-digit One-Time Passwords (OTPs) in the `otp-service.ts` file. `Math.random()` is not a Cryptographically Secure Pseudo-Random Number Generator (CSPRNG) and produces predictable values.
**Learning:** Using predictable random numbers for security-sensitive tokens like OTPs or session identifiers allows attackers to easily guess valid tokens, leading to account takeover or authentication bypass. Standard library random functions are designed for statistical randomness, not cryptographic security.
**Prevention:**
1. Always use the native `crypto` module (e.g., `crypto.randomInt()`, `crypto.randomBytes()`) or equivalent CSPRNGs for generating security-sensitive values.
2. Review all usages of `Math.random()` in the codebase and replace them with secure alternatives if they are used in a security context.
