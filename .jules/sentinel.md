## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.

## 2025-02-28 - Insecure Random Number Generation for Passwords and OTPs
**Vulnerability:** `Math.random()` was used to generate 6-digit OTP codes and fallback user passwords during OAuth flows.
**Learning:** Standard Math.random() is predictable and unsuitable for security-sensitive operations. Predictability in OTP generation can lead to account takeover, and predictable dummy passwords can theoretically lead to brute force if left unchanged.
**Prevention:** Always use Node's built-in `crypto` module (`crypto.randomInt` or `crypto.randomBytes`) for generating any security-critical tokens, codes, passwords, or secrets.
