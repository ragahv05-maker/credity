## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.

## 2025-02-18 - [Weak Cryptography in OAuth Fallback]
**Vulnerability:** In `BlockWalletDigi`, the OAuth callback routines for Google and Apple generated fallback passwords for new users using `String(Math.random())`. This predictable generation mechanism introduces a critical vulnerability where an attacker could guess the hash and bypass authentication via password login, compromising accounts created via OAuth.
**Learning:** `Math.random()` should never be used for security purposes, such as generating passwords, tokens, or identifiers (like document IDs). Its implementation is not cryptographically secure and is deterministic enough to be predicted by an attacker.
**Prevention:** Always use `crypto.randomBytes()` or another cryptographically secure pseudorandom number generator (CSPRNG) when generating secrets, passwords, tokens, or critical identifiers.
