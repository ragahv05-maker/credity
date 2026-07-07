## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.
## 2024-07-07 - Math.random() in 2FA Backup Codes
**Vulnerability:** Weak random number generation in `generateBackupCodes` in `server/services/two-factor.ts` used `Math.random()`.
**Learning:** Using `Math.random()` for generating sensitive strings like 2FA backup codes is insecure because it is predictable and not cryptographically secure. This could allow an attacker to predict backup codes and bypass 2FA.
**Prevention:** Always use cryptographically secure random number generators (e.g., `crypto.randomInt` or `crypto.randomBytes`) when generating security-sensitive values like tokens, OTPs, or backup codes.
