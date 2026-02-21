# Phase C — Agent 2 Biometric Runtime (liveness + biometrics)

Date: 2026-02-21
Repo: `/Users/raghav/Desktop/credity`
Scope: `BlockWalletDigi` biometric/liveness production hardening

## 1) Audit: non-real / deterministic placeholders found

### A. `server/routes/identity.ts` (`POST /liveness/complete`)

- **Found**: endpoint could force-pass by `passed: true` and then auto-complete all liveness challenges with synthetic telemetry (`spoofRisk:0.05`, hardcoded blink/yaw/smile), including fake frame fallback.
- **Risk**: bypassed real challenge-response and anti-spoof pathway.

### B. `server/services/liveness-service.ts`

- **Found**: final `faceEmbedding` produced via deterministic hash of frame chunk (`sha256(frameData.slice(...))`) instead of model extraction.
- **Risk**: not a biometric embedding, unusable for production-grade face template pipeline.

### C. `server/services/ai-adapter.ts`

- **Found**: deterministic fallback adapter produced pseudo AI results from seeded hash when provider unavailable.
- **Risk**: non-real liveness/doc judgments in production failure mode.

### D. `server/routes/identity.ts` (`POST /biometrics/enroll`)

- **Found**: accepted raw `faceEmbedding` from client by default.
- **Risk**: insecure trust boundary; client-supplied embeddings can be forged.

---

## 2) Implemented runtime changes

## Files changed

- `BlockWalletDigi/server/services/model-sidecar-service.ts` **(new)**
- `BlockWalletDigi/server/services/liveness-service.ts`
- `BlockWalletDigi/server/services/ai-adapter.ts`
- `BlockWalletDigi/server/routes/identity.ts`
- `BlockWalletDigi/tests/identity-liveness-challenge-hooks.test.ts`
- `BlockWalletDigi/tests/biometrics-encryption-workflow.test.ts`

### A. Model sidecar contract wired

Added `model-sidecar-service.ts` with strict, validated contracts:

- `POST /v1/biometrics/liveness-infer`
  - input: `frameData`, `challengeType`, `cameraEvidence`, `sessionId`, `userId`
  - output schema: `isReal/confidence/spoofingDetected/faceDetected/reasoning/embedding?`
- `POST /v1/biometrics/embedding-extract`
  - input: `frameData`, `source`, `sessionId?`, `userId`
  - output: numeric embedding array (validated)

Auth/transport:

- `MODEL_SIDECAR_URL`
- `MODEL_SIDECAR_API_KEY`
- Bearer auth enforced
- timeout enforced (`MODEL_SIDECAR_TIMEOUT_MS`)

### B. Liveness completion made real-path only

`/liveness/complete` now:

- requires `sessionId`
- returns existing computed session result only
- **removed** synthetic challenge completion pathway and fake evidence injection

### C. Liveness finalization now ingests real model signal

In `liveness-service.completeChallenge(...)` final step:

- sidecar inference called (`inferLivenessAndEmbedding`) with challenge telemetry
- success now gated by anti-spoof + face detection including sidecar signal
- resulting embedding hash derived from returned embedding vector
- raw vector persisted in result as `faceEmbeddingVector` (for server-side enrollment handoff)

### D. Secure biometric enrollment policy tightened

`/biometrics/enroll` now:

- rejects raw client embeddings by default (`raw_client_embedding_rejected`)
- allows raw client embedding only if explicit override:
  - `ALLOW_CLIENT_EMBEDDING_INGEST=true` (test/dev escape hatch)
- preferred production sources:
  1. sidecar extraction from `frameData`
  2. prior liveness session embedding (`livenessSessionId` → `faceEmbeddingVector`)

### E. Deterministic AI fallback removed

`ai-adapter` now uses strict unavailable adapter when no provider key configured:

- no pseudo-random deterministic “analysis”
- provider not configured => error path (`ai_provider_unavailable`)

---

## 3) Anti-spoof + challenge telemetry checks status

Existing checks in liveness + face-match pipelines are now actively coupled with sidecar ingestion:

- challenge-order enforcement
- per-challenge motion/signal checks (blink/yaw/smile/pitch)
- spoof-risk threshold rejection
- live-face required in biometric match path (`anti_spoof_check_failed` enforced)

---

## 4) Tests executed

Command:

```bash
npm test -- --run tests/identity-liveness-challenge-hooks.test.ts tests/biometrics-encryption-workflow.test.ts tests/identity-face-match-accuracy.test.ts tests/identity-liveness-accuracy-benchmark.test.ts
```

Result:

- **4/4 test files passed**
- **7/7 tests passed**

Notes:

- liveness challenge tests mock sidecar inference contract (unit/integration boundary)
- biometrics workflow test uses `ALLOW_CLIENT_EMBEDDING_INGEST=true` for backward-compat test harness only

---

## 5) Exact integration gaps requiring infra keys/services

1. **Model sidecar deployment (required)**
   - Missing runtime service endpoints:
     - `POST /v1/biometrics/liveness-infer`
     - `POST /v1/biometrics/embedding-extract`
   - Required env:
     - `MODEL_SIDECAR_URL`
     - `MODEL_SIDECAR_API_KEY`

2. **AI provider key (optional but recommended)**
   - `GEMINI_API_KEY` for document/liveness auxiliary AI path
   - Without this, adapter runs strict-unavailable path (no deterministic fake fallback)

3. **Biometric template key management hardening (required for prod)**
   - `BIOMETRIC_TEMPLATE_KEY` must be provisioned by secrets manager/KMS
   - Current fallback key generation is process-local and unsuitable for horizontal scaling/restart persistence

4. **Server-to-sidecar trust controls (required)**
   - mTLS or internal network + key rotation policy for sidecar API key
   - request signing / replay window recommended for telemetry integrity

5. **Operational telemetry pipeline (required for anti-fraud observability)**
   - Persist challenge telemetry + sidecar inference response IDs for audit/replay investigation
   - Add alerting on spoof-risk spikes and model error rates

---

## 6) Production policy outcome

Biometric/liveness flow is now structurally aligned with production runtime expectations:

- no synthetic challenge auto-pass route
- no deterministic pseudo-AI fallback
- embedding ingestion wired to model-sidecar contract
- encrypted-template-only biometric storage path retained
- anti-spoof and challenge telemetry checks enforced in verification path
