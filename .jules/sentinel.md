## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.
## 2025-02-18 - [Insecure Randomness in OTP and Auth Generation]
**Vulnerability:** Weak, predictable random number generation (`Math.random()`) was being used for sensitive security mechanisms including OTP generation, user password salts/hashes, and Apple/Google OAuth fallback accounts. This predictability allows an attacker to easily guess verification codes, bypass multi-factor authentication, or compromise newly created accounts.
**Learning:** `Math.random()` provides zero cryptographic security and is completely predictable. Cryptographically Secure Pseudo-Random Number Generators (CSPRNG) must be strictly enforced for any security-related random value.
**Prevention:**
1. Always use Node.js's native `crypto` module (e.g., `crypto.randomInt()`, `crypto.randomBytes()`) for generating OTPs, passwords, secrets, backup codes, and session identifiers.
2. Ensure automated linters explicitly flag the use of `Math.random()` in authentication or security context files.
