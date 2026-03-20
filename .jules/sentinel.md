## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.

## 2025-03-20 - [Insecure Randomness in Security Artifacts]
**Vulnerability:** Found `Math.random()` used in `CredVerseIssuer 3/server/services/two-factor.ts` to generate 2FA backup codes.
**Learning:** `Math.random()` is not a cryptographically secure pseudo-random number generator (CSPRNG), which makes generated security tokens (like backup codes) predictable and vulnerable to attack.
**Prevention:** Always use Node.js's native `crypto` module (e.g. `crypto.randomInt` or `crypto.randomBytes`) for generating any security-sensitive artifacts, including tokens, OTPs, or passwords.
