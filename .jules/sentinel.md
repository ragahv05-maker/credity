## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.
## 2025-02-18 - Prevent Timing Attacks in HMAC Verification
**Vulnerability:** HMAC signatures for incoming webhooks were validated using the standard equality operator (`!==`), leaving the endpoint susceptible to timing attacks.
**Learning:** Standard string comparisons stop at the first differing character, leaking the length of the matching prefix through response times. Even small timing variations can theoretically be exploited to forge signatures over the network.
**Prevention:** Always use `crypto.timingSafeEqual` to verify cryptographic signatures (like HMACs or JWT hashes). Since `timingSafeEqual` expects buffers of identical lengths, ensure you perform an initial constant-time length check or gracefully handle length mismatches before passing inputs to it.
