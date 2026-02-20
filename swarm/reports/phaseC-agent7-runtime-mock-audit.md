# Phase C — Agent 7 Runtime Mock/Demo/Fake Sweep

Date: 2026-02-21
Scope: full runtime sweep for server-side production paths + client critical auth/verification flows. Test/spec files excluded.

## Summary
- Completed targeted sweep across:
  - `BlockWalletDigi/server`
  - `CredVerseRecruiter/server`
  - `CredVerseIssuer 3/server`
  - Critical wallet client flows (`connect-digilocker`, `receive`, reputation preview contract surface)
- Implemented **3 high-severity fixes directly** (fail-close/remove).
- Produced strict elimination checklist below with file+line, severity, action, status.

## High-severity fixes implemented

1) **Removed static trusted issuer bootstrapping from recruiter verification runtime**
- File: `CredVerseRecruiter/server/services/verification-engine.ts:153-155`
- Risk: hardcoded pre-trusted issuer/demo seed could mask real registry trust requirements.
- Action: **REMOVE**
- Change: `trustedIssuers` now initialized as empty list.

2) **Fail-close document scan extraction in production when OCR unavailable**
- File: `BlockWalletDigi/server/services/document-scanner-service.ts:336-339`
- Risk: OCR failure path could previously fall back to mock extracted identity fields, producing fake verification artifacts.
- Action: **FAIL-CLOSE**
- Change: when no OCR text and production, extracted fields become `[]` (score fails), instead of mock data.

3) **Removed implicit demo offer token fallback from credential receive flow**
- File: `BlockWalletDigi/client/src/pages/receive.tsx:22-25`
- Risk: critical verification intake accepted implicit `token=demo` when URL absent.
- Action: **REMOVE + FAIL-CLOSE**
- Change: URL is mandatory; empty URL immediately errors. Demo CTA copy changed at `receive.tsx:136`.

---

## Strict elimination checklist

| File:Line | Severity | Finding | Action | Status |
|---|---|---|---|---|
| `CredVerseRecruiter/server/services/verification-engine.ts:153-155` | HIGH | Runtime issuer trust list was seeded (demo/static trust pattern). | REMOVE | ✅ Fixed |
| `BlockWalletDigi/server/services/document-scanner-service.ts:336-339` | HIGH | OCR-unavailable path previously used mock extracted fields in document verification pipeline. | FAIL-CLOSE | ✅ Fixed |
| `BlockWalletDigi/client/src/pages/receive.tsx:22-25` | HIGH | Credential claim flow accepted implicit demo offer URL when missing input. | REMOVE / FAIL-CLOSE | ✅ Fixed |
| `BlockWalletDigi/server/services/trust-score-service.ts:252-267` | MEDIUM | Trust history generated via random mock progression for users without history. | REPLACE | ⚠ Pending |
| `BlockWalletDigi/server/services/billing-service.ts:62-77` | MEDIUM | Dev-mode mock billing responses returned when Razorpay creds absent (non-prod). | FAIL-CLOSE (or explicit dev-only module split) | ⚠ Pending |
| `BlockWalletDigi/client/src/lib/reputation-preview-data.ts:121-133` | MEDIUM | Live reputation load failure silently falls back to mock payload. | FAIL-CLOSE for critical surfaces / explicit degraded-state UX | ⚠ Pending |
| `CredVerseIssuer 3/server/storage.ts:203-214` | MEDIUM | In-memory storage seeds `Demo University` trusted issuer data. | REPLACE/REMOVE (seed behind explicit non-prod flag) | ⚠ Pending |
| `BlockWalletDigi/client/src/pages/connect-digilocker.tsx:220-223` | LOW | UI exposes Demo Mode badge (informational only). | KEEP or remove for production builds | ⚠ Pending decision |
| `BlockWalletDigi/client/src/pages/receive.tsx:133` | LOW | Scanner view still shows `[Camera Feed Mockup]` placeholder text. | REPLACE | ⚠ Pending |
| `BlockWalletDigi/server/services/digilocker-service.ts:88-99` | LOW | Demo mode logic present but correctly gated to non-production and hard-fails in production when unconfigured. | KEEP (already fail-closed in prod) | ✅ Acceptable |

## Notes for merge/review
- No test files were modified.
- Current changes are strictly runtime hardening for mock/demo elimination on high-risk paths.
- Recommended next pass: eliminate medium findings in trust history, reputation preview fallback behavior, and issuer memory seeding to fully satisfy “no mock runtime behavior” in all non-test production paths.
