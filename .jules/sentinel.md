## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.

## 2025-05-22 - [Insecure Randomness for OTP Generation]
**Vulnerability:** The `otp-service.ts` in `BlockWalletDigi` used `Math.random()` to generate One-Time Passwords (OTPs). `Math.random()` is not a Cryptographically Secure Pseudo-Random Number Generator (CSPRNG), making the OTPs potentially predictable.
**Learning:** Security-sensitive tokens and codes should never be generated using weak pseudorandom number generators like `Math.random()`.
**Prevention:** Always use a CSPRNG, such as Node.js's native `crypto.randomInt()`, when generating random values for security purposes (e.g., OTPs, tokens, passwords).
