# SynthID Evidence Adapter (Stub)

## What was added
- `BlockWalletDigi/server/services/synthid-adapter.ts`
- `BlockWalletDigi/tests/synthid-adapter.test.ts`
- `BlockWalletDigi/server/services/evidence-analysis.ts` now attaches `analysisDetails.synthId` for evidence uploads.

## Why this is a stub
Google SynthID is primarily a watermarking mechanism attached at generation time (Imagen/Gemini ecosystem). Public, broadly available detector APIs for third-party arbitrary evidence intake are limited/unclear for production use cases.

This adapter keeps Credity ready for detector onboarding without coupling current claim processing to a vendor dependency.

## Config
Optional env vars:
- `SYNTHID_DETECTOR_ENDPOINT`
- `SYNTHID_API_KEY`
- `SYNTHID_TIMEOUT_MS` (default: `2500`)

## Current behavior
- `document` media type => `unsupported`
- no endpoint configured => `unavailable`
- endpoint configured => POSTs `{ url, mediaType, metadata }`
- expects detector response `{ verdict, confidence }`
  - supported verdicts: `watermark_detected | not_detected | unsupported`

## Important guardrail
SynthID **non-detection is not proof of authenticity**. It should be treated as one weak signal in a larger evidence-auth pipeline (EXIF, tamper checks, deepfake analysis, timeline consistency, and issuer verification).
