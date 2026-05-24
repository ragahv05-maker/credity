## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.

## 2024-05-24 - [Insecure Randomness for Security Tokens]
**Vulnerability:** The application used `Math.random()` to generate highly sensitive values: 6-digit OTP codes and placeholder passwords for OAuth users.
**Learning:** `Math.random()` is a non-cryptographically secure pseudo-random number generator (PRNG). Attackers can potentially predict the random values generated if they can observe a few outputs, which compromises the security of mechanisms relying on them, such as OTP validation or password resets.
**Prevention:** Always use cryptographically secure random number generators (CSPRNGs) like Node.js's built-in `crypto` module (e.g., `crypto.randomInt()`, `crypto.randomBytes()`) when generating security-sensitive tokens, passwords, or keys.
