## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.

## 2025-04-10 - [Predictable OTP Generation]
**Vulnerability:** OTPs were generated using `Math.random()`, which is predictable and not cryptographically secure.
**Learning:** Using predictable pseudo-random number generators (PRNGs) for security-sensitive tokens (like OTPs) can allow attackers to predict future tokens and bypass authentication.
**Prevention:** Always use cryptographically secure random number generators (CSPRNGs), such as the Node.js `crypto` module's `randomBytes` or `randomInt` functions, for generating OTPs, tokens, passwords, and other security-sensitive values.
