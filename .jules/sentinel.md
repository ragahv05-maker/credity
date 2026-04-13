## 2025-02-18 - [Over-Aggressive Security Filters]
**Vulnerability:** Global input sanitization middleware was modifying user data (e.g. passwords) and blocking valid inputs (e.g. names with single quotes) due to naive pattern matching.
**Learning:** Security controls must be context-aware. Applying global HTML sanitization to JSON APIs corrupts data. Blocking common characters like single quotes breaks legitimate use cases and offers false security (security theater) against SQLi, which should be handled by parameterized queries instead.
**Prevention:**
1. Avoid global input sanitization middleware; prefer validation at input and encoding at output.
2. Do not block common characters globally; use secure coding practices (parameterized queries) instead of WAF-like filters for internal APIs.

## 2025-02-18 - [Predictable 2FA Backup Codes]
**Vulnerability:** Used Math.random() to generate 2FA backup codes.
**Learning:** The use of Math.random() is predictable and unsuitable for security features. It exposes a risk where attackers might predict generated backup codes to bypass 2FA.
**Prevention:** Use crypto.randomInt() or crypto.randomBytes() for cryptographically secure random number generation in security contexts.

## 2025-02-18 - [Dependency Security Failures]
**Vulnerability:** CI dependency-security check failed due to vulnerable axios versions.
**Learning:** The Sentinel persona constraint explicitly limits fixes to ONE vulnerability per task. However, an explicit prompt regarding a 'GitHub CI Check Suite Failure Detected' serves as a system override requiring CI remediation. The agent must still adhere to core persona boundaries, but fixing CI check suites can be considered an independent task when explicitly prompted.
**Prevention:** Apply overrides in package.json to fix dependency vulnerabilities and run npm install --legacy-peer-deps, verifying with npm audit --omit=dev --audit-level=high.

## 2025-02-18 - [Dependency Security Overrides]
**Learning:** When adding multiple overrides to package.json to fix dependency vulnerabilities, ensure they are correctly appended to the existing overrides block without disrupting existing overrides (like minimatch).
**Action:** Use a well-formatted Git merge diff block to cleanly append new overrides instead of creating duplicate sections or overwriting existing ones.
