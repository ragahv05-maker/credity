# Parallel Track B2 — Selective OSS OCR Integration Plan (PaddleOCR primary, Tesseract fallback)

**Date:** 2026-02-21 (IST)  
**Repo:** `/Users/raghav/Desktop/credity`  
**Objective:** Add production-grade OCR for document verification **without blocking core build/launch path**.

---

## 1) Proposed architecture (non-blocking by default)

## Design goals
- Keep core verification pipeline stable and fast.
- Add OCR as a **parallel enrichment lane** first, then progressive hardening for eligible flows.
- Fail safe for high-risk docs (fail-closed), but never silently auto-pass on OCR uncertainty.

## Components
1. **Document Verification API (existing service path)**
   - Receives upload + metadata (`docType`, `country`, `userId`, `verificationId`).
2. **OCR Orchestrator (new service module in Recruiter or Wallet verification domain)**
   - Normalizes image/PDF pages.
   - Calls OCR sidecar with timeout budget.
   - Applies confidence gating + field-level rules.
3. **OCR Sidecar (new container/service)**
   - Primary engine: **PaddleOCR** (PP-OCRv4 mobile/server model depending infra tier).
   - Fallback engine: **Tesseract** when Paddle fails/timeout/model unavailable.
4. **Validation/Policy layer**
   - Rules for mandatory fields per document type.
   - Cross-check OCR extracted fields vs user-provided data.
5. **Storage/Audit**
   - Persist OCR result JSON, confidence map, engine used, timings, reason codes.
6. **Queue (optional but recommended)**
   - Async OCR jobs for non-blocking endpoint behavior in phase 1–2.

## Request flow
1. Verification request accepted.
2. Core verification continues as today.
3. OCR job enqueued (or sync for allowlisted flows).
4. Sidecar attempts PaddleOCR.
5. If Paddle error/timeout/empty output → Tesseract fallback.
6. Orchestrator scores extraction quality and sets status:
   - `OCR_PASS`, `OCR_REVIEW_REQUIRED`, or `OCR_HARD_FAIL`.
7. Decision engine combines OCR signal with existing verification controls.

---

## 2) Sidecar/API contract

## Internal endpoint contract (service → OCR sidecar)
`POST /v1/ocr/extract`

### Request
```json
{
  "requestId": "uuid",
  "verificationId": "string",
  "documentType": "passport|drivers_license|aadhaar|pan|resume|other",
  "country": "IN",
  "mimeType": "image/jpeg",
  "imageBase64": "...",
  "pages": [
    { "index": 1, "imageBase64": "..." }
  ],
  "hints": {
    "languages": ["en"],
    "expectedFields": ["fullName", "dob", "documentNumber", "expiryDate"],
    "preferPrimary": true,
    "maxLatencyMs": 2500
  }
}
```

### Response
```json
{
  "requestId": "uuid",
  "engineUsed": "paddleocr|tesseract",
  "fallbackUsed": true,
  "timingMs": {
    "total": 1840,
    "preprocess": 220,
    "ocr": 1430,
    "postprocess": 190
  },
  "documentQuality": {
    "blurScore": 0.11,
    "glareScore": 0.06,
    "rotation": 0
  },
  "fields": [
    {
      "name": "fullName",
      "value": "RAGHAV SHARMA",
      "confidence": 0.94,
      "bbox": [10, 20, 120, 35]
    }
  ],
  "rawText": "...",
  "overallConfidence": 0.89,
  "status": "PASS|REVIEW|FAIL",
  "reasonCodes": ["OCR_LOW_CONFIDENCE", "FIELD_MISSING_DOB"]
}
```

### Error response
```json
{
  "requestId": "uuid",
  "code": "OCR_TIMEOUT|OCR_ENGINE_UNAVAILABLE|OCR_BAD_INPUT",
  "message": "...",
  "retryable": true
}
```

## Core service contract extension (northbound)
Add non-breaking OCR fields to verification result payload:
- `ocrStatus`
- `ocrEngine`
- `ocrConfidence`
- `ocrReasonCodes[]`
- `ocrCompletedAt`

Default for legacy clients: omitted or `ocrStatus: "NOT_RUN"` until feature flag enabled.

---

## 3) Rollout phases (do not block core build)

## Phase 0 — Spike (1–2 days)
- Standalone sidecar PoC with one doc type and 30–50 sample images.
- Validate Paddle primary + Tesseract fallback path.
- No changes to blocking production decision path.

## Phase 1 — Dark launch (read-only OCR signal)
- OCR invoked asynchronously behind `FEATURE_OCR_ENRICHMENT=true`.
- Store metrics/results only; do not alter verification decision.
- Build baseline confidence/latency histograms.

## Phase 2 — Soft influence (review-only gating)
- OCR can trigger **manual review** only.
- OCR cannot auto-approve or auto-reject yet.
- Enable by tenant/docType allowlist.

## Phase 3 — Selective fail-closed for high-risk docs
- For explicitly configured high-risk flows, missing mandatory OCR fields => fail-closed.
- Keep fallback/manual lane for user recovery (re-upload, alternate doc).

## Phase 4 — Generalized production
- Expand coverage by doc type + country matrix.
- Add model/version governance and drift monitoring.

---

## 4) Fail-closed policy (explicit)

Fail-closed applies only when **all** are true:
1. Flow is in `ocr.failClosed.allowlist`.
2. Document type has mandatory field schema.
3. OCR status is `FAIL` OR required fields below confidence threshold.

In fail-closed mode:
- Return deterministic error (`OCR_VERIFICATION_FAILED_CLOSED`).
- Do **not** auto-pass on fallback failure.
- Route user to recovery path: re-capture upload or manual review queue.

Non-fail-closed mode:
- OCR failure => `REVIEW_REQUIRED` or continue with existing verification controls (as configured).

Suggested thresholds (initial):
- Field confidence min: `0.85` (ID number, DOB, expiry)
- Name confidence min: `0.80`
- Overall confidence min: `0.82`
- Timeout budget: `2.5s` per page (sync) / `8s` job max (async)

---

## 5) Accuracy + latency test plan

## Dataset
- Build labeled dataset by doc type/country (minimum 300 samples/doc type before fail-closed).
- Include edge cases: blur, glare, low-light, compression artifacts, rotation, cropped edges.
- Stratify by language/scripts expected in market.

## Accuracy metrics
- Field-level precision/recall/F1.
- Exact-match rate for key fields (`docNumber`, `dob`, `expiryDate`, `name`).
- OCR confidence calibration (confidence vs actual correctness).
- Fallback effectiveness: delta accuracy when using Tesseract fallback.

## Latency metrics
- P50/P95/P99 total OCR time.
- Per-engine timing (Paddle vs Tesseract).
- Timeout/failure rate under peak concurrency.

## Acceptance gates
- Dark launch gate: P95 < 2.5s/page, engine error rate < 2%.
- Review-only gate: key-field F1 >= 0.92 for target doc type.
- Fail-closed gate: false reject rate < 1.5% in controlled tenant cohort.

## Test execution
- Offline benchmark suite in CI (small deterministic sample).
- Nightly expanded benchmark on staging node with production-like CPU/RAM.
- Contract tests for sidecar API, fallback triggering, and reason code consistency.

---

## 6) Infrastructure requirements

## Runtime
- Deploy OCR as isolated sidecar/container (`ocr-service`).
- CPU-first profile initially; optional GPU pool later for high throughput.

## Suggested baseline sizing
- **Staging:** 2 vCPU, 4 GB RAM, 1 replica.
- **Production (initial):** 4 vCPU, 8 GB RAM, 2 replicas min.
- Autoscale on queue depth + CPU > 70%.

## Dependencies
- PaddleOCR runtime + model artifacts mounted/versioned.
- Tesseract + language data packs for supported locales.
- Shared object store for temporary image/page artifacts (TTL cleanup).

## Observability
- Metrics:
  - `ocr_requests_total`
  - `ocr_latency_ms`
  - `ocr_engine_fallback_total`
  - `ocr_fail_closed_total`
  - `ocr_field_confidence_bucket`
- Structured logs with `requestId`, `verificationId`, `engineUsed`, `reasonCodes`.
- Trace spans: preprocess → primary OCR → fallback OCR → postprocess.

## Security/compliance
- Encrypt in transit + at rest.
- Redact or hash sensitive extracted fields in logs.
- Time-bound retention of raw images and OCR raw text.

---

## 7) Minimal spike implementation checklist

1. Create sidecar skeleton
   - `services/ocr-sidecar/` with `/health` and `/v1/ocr/extract`.
2. Add PaddleOCR primary path
   - Basic preprocess + text/field extraction wrapper.
3. Add Tesseract fallback path
   - Trigger on primary timeout/error/empty output.
4. Implement confidence schema
   - Field-level + overall confidence, reason codes.
5. Add orchestrator client in verification service
   - Timeout, retries (max 1), circuit breaker.
6. Add feature flags
   - `FEATURE_OCR_ENRICHMENT`, `FEATURE_OCR_FAIL_CLOSED`, allowlists by tenant/docType.
7. Persist OCR audit payload
   - Non-breaking DB table/JSON column or event stream.
8. Add tests
   - Contract tests (API), unit tests (fallback/threshold), one integration test with sample files.
9. Add dashboard + alert starter pack
   - Latency, error rate, fallback rate, fail-closed counts.
10. Run spike report-out
   - Accuracy/latency summary + go/no-go for Phase 1 dark launch.

---

## 8) Non-blocking integration principle (explicit commitment)

- OCR is initially an **adjacent enrichment lane**, not a hard dependency for core build path.
- All OCR decision influence is gated by feature flags and allowlists.
- Core verification remains operational if sidecar is down.
- Fail-closed only in explicitly enabled high-risk flows after passing acceptance gates.
