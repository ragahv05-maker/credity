## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.

## 2026-04-01 - [Insecure Randomness in 2FA Backup Codes]
**Vulnerability:** 2FA backup codes were generated using `Math.random()`, which is not cryptographically secure.
**Learning:** Security-sensitive tokens like OTPs and backup codes must use a CSPRNG (e.g., `crypto.randomInt`) to prevent predictability and brute-force attacks. `Math.random()` should never be used for security purposes.
**Prevention:** Always use Node's built-in `crypto` module for generating random values that serve as secrets or authenticators.
