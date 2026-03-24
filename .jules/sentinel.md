## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.

## 2025-02-23 - [Insecure Randomness for OTP Generation]
**Vulnerability:** Weak PRNG `Math.random()` was used to generate 6-digit One-Time Passwords (OTPs) in `BlockWalletDigi/server/services/otp-service.ts`.
**Learning:** `Math.random()` is not a Cryptographically Secure Pseudo-Random Number Generator (CSPRNG) and its outputs can potentially be predicted, leading to OTP bypass or brute-forcing if an attacker observes enough outputs or the RNG state. Node.js `crypto.randomInt` must be used for any security-sensitive random value generation.
**Prevention:**
1. Always use `crypto.randomInt` or `crypto.randomBytes` instead of `Math.random()` for generating OTPs, tokens, or any security-sensitive random strings/numbers.
2. Implement automated linting rules (e.g., eslint-plugin-security) to detect and flag usages of `Math.random()`.