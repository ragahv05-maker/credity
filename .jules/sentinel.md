## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.
## 2024-05-18 - Math.random() is insecure for codes
**Vulnerability:** Found `Math.random()` being used to generate 2FA backup codes.
**Learning:** This makes 2FA backup codes predictable because `Math.random()` isn't cryptographically secure.
**Prevention:** Always use `crypto.randomInt` or `crypto.randomBytes` to generate secrets, OTPs, or backup codes.
