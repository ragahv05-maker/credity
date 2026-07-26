## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.
## 2024-05-15 - Insecure Random Number Generation for Authentication Codes
**Vulnerability:** Weak, predictable `Math.random()` was used to generate OTPs (in `BlockWalletDigi`) and 2FA backup codes (in `CredVerseIssuer 3`).
**Learning:** Standard JavaScript PRNGs like `Math.random()` are not cryptographically secure and can be predicted by an attacker.
**Prevention:** Always use `crypto.randomInt()` or `crypto.randomBytes()` from the Node.js `crypto` module when generating sensitive values like OTPs, tokens, passwords, or backup codes.
