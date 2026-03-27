## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.

## 2025-02-23 - [Weak RNG for OTPs]
**Vulnerability:** Predictable OTP generation using `Math.random()` in `BlockWalletDigi/server/services/otp-service.ts`.
**Learning:** `Math.random()` is not cryptographically secure and can be predicted, potentially allowing attackers to bypass 2FA.
**Prevention:** Always use Node.js `crypto` module (`crypto.randomInt` or `crypto.randomBytes`) for generating security-sensitive values like OTPs, tokens, or passwords.

## 2025-02-23 - [ESM vs CommonJS named exports]
**Learning:** Overriding `brace-expansion` to `^2.0.1` broke the `vitest` execution in `CredVerseIssuer 3` because the older version is a CommonJS module that does not support the named export `expand` expected by the codebase (which expects ESM).
**Action:** Always ensure dependency overrides (especially for low-level parsing libraries like `brace-expansion`) remain compatible with the project module type (`"type": "module"`). Bumping to `^5.0.5` resolved both the vulnerability and the ESM import issue.
