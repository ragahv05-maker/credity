## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.
## 2025-02-19 - [Insecure Randomness in Security Contexts]
**Vulnerability:** Weak pseudo-random number generator (`Math.random()`) was being used for generating sensitive security codes, specifically OTPs and 2FA backup codes.
**Learning:** `Math.random()` is not cryptographically secure. Generating OTPs and backup codes with it makes them predictable and susceptible to guessing or brute-force attacks if the internal state of the RNG is observed.
**Prevention:** Always use cryptographically secure pseudo-random number generators (CSPRNG) for any security-sensitive operations (e.g., `crypto.randomInt` in Node.js) rather than `Math.random()`.
