## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.

## 2025-04-09 - [Predictable OTP Generation]
**Vulnerability:** The OTP generation function used `Math.random()`, which is a predictable pseudorandom number generator, allowing potential prediction of verification codes and account takeover.
**Learning:** Never use `Math.random()` for security-sensitive operations like generating passwords, tokens, or OTPs because its outputs are reproducible if the internal state is known.
**Prevention:** Always use cryptographically secure random number generators (CSPRNG) such as Node's `crypto.randomInt()` or `crypto.randomBytes()` for any security-related random generation.
