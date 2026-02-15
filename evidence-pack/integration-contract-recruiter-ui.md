# Recruiter UI ↔ Recruiter API integration contract (CredVerseRecruiter)

Source of truth: `CredVerseRecruiter/client/src/pages/*` (UI calls) + `CredVerseRecruiter/server/routes/*` (Express routes).

> Base: UI calls relative paths like `/api/...` (same-origin).

## ✅ Endpoints used by Recruiter UI

### 1) Health
**GET** `/api/health`
- **Auth:** none
- **Response (200)**
  ```json
  {
    "status": "ok",
    "app": "recruiter",
    "timestamp": "2026-02-15T...Z",
    "blockchain": { }
  }
  ```
- **Server:** `server/routes.ts`

---

### 2) Verification stats (Dashboard cards)
**GET** `/api/verifications/stats`
- **Auth:** none (currently)
- **Response (200)**
  ```json
  {
    "success": true,
    "stats": {
      "total": 0,
      "today": 0,
      "verified": 0,
      "failed": 0,
      "suspicious": 0,
      "avgRiskScore": 0,
      "avgFraudScore": 0,
      "recommendations": { "approve": 0, "review": 0, "reject": 0 }
    }
  }
  ```
- **UI expects:** `stats.stats.total/today/verified/failed/suspicious/avgRiskScore/avgFraudScore/recommendations.*`
- **UI file:** `client/src/pages/Dashboard.tsx`
- **Server:** `server/routes/analytics.ts`

---

### 3) Recent verifications (Dashboard feed)
**GET** `/api/verifications?limit=5`
- **Auth:** none (currently)
- **Query params:**
  - `limit` (number, default 50 server-side slice)
  - `status` (optional)
  - `startDate`, `endDate` (optional, date strings)
- **Response (200)**
  ```json
  {
    "success": true,
    "total": 123,
    "results": [
      {
        "id": "...",
        "credentialType": "...",
        "issuer": "...",
        "subject": "...",
        "status": "verified|failed|suspicious|pending",
        "riskScore": 12,
        "fraudScore": 7,
        "recommendation": "approve|accept|review|reject",
        "timestamp": "2026-02-15T...Z" 
      }
    ]
  }
  ```
- **UI expects per record:**
  - `id`, `credentialType`, `issuer`, `subject`, `status`, `riskScore`, `fraudScore`, `recommendation`, `timestamp`
- **UI file:** `client/src/pages/Dashboard.tsx`
- **Server:** `server/routes/analytics.ts`

---

### 4) Instant verify (JWT / raw credential)
**POST** `/api/verify/instant`
- **Auth:** none (legacy verify routes are *deprecated*, but not auth-protected)
- **Headers:** `Content-Type: application/json`
- **Request body (UI sends):**
  ```json
  {
    "jwt": "<vc-jwt>",
    "credential": { },
    "verifiedBy": "Recruiter Portal User"
  }
  ```
  Notes:
  - Provide at least one of `jwt`, `qrData`, or `credential`.
  - UI only uses `jwt` currently.

- **Response (200)**
  ```json
  {
    "success": true,
    "verification": {
      "status": "verified|failed|suspicious|pending",
      "confidence": 0,
      "checks": [{"name":"...","status":"passed|failed|warning|skipped","message":"...","details":{}}],
      "riskScore": 0,
      "riskFlags": ["..."],
      "timestamp": "2026-02-15T...Z",
      "verificationId": "..."
    },
    "fraud": {
      "score": 0,
      "ruleScore": 0,
      "aiScore": 0,
      "flags": ["..."],
      "recommendation": "accept|approve|review|reject",
      "details": [{"check":"...","status":"...","message":"...","result":"...","impact":0}],
      "ai": {
        "provider": "...",
        "score": 0,
        "confidence": 0,
        "summary": "...",
        "signals": [{"code":"...","severity":"...","message":"..."}]
      }
    },
    "record": {
      "id": "...",
      "credentialType": "...",
      "issuer": "...",
      "subject": "...",
      "status": "...",
      "riskScore": 0,
      "fraudScore": 0,
      "recommendation": "...",
      "timestamp": "2026-02-15T...Z",
      "verifiedBy": "..."
    }
  }
  ```
- **UI expects:** `data.verification`, `data.fraud`, `data.record`
- **UI file:** `client/src/pages/InstantVerify.tsx`
- **Server:** `server/routes/verification.ts`

---

### 5) Verify by link (fetch VC from URL)
**POST** `/api/verify/link`
- **Auth:** **required** (Bearer token). Implemented via `requireProofAccess`.
  - Accepts roles: `recruiter|admin|verifier`
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer <accessToken>`
- **Request body (UI sends):**
  ```json
  { "link": "https://issuer.example.com/api/v1/public/issuance/offer/consume?token=..." }
  ```
- **Response (200)**
  ```json
  { "success": true, "verification": { }, "fraud": { }, "record": { } }
  ```
  (same shapes as `/api/verify/instant` above)
- **UI file:** `client/src/pages/InstantVerify.tsx`
- **Server:** `server/routes/verification.ts`

---

### 6) Bulk verify (CSV upload)
**POST** `/api/verify/bulk`
- **Auth:** none (legacy verify routes are deprecated, but not auth-protected)
- **Headers:** `Content-Type: application/json`
- **Request body (UI sends):**
  ```json
  {
    "credentials": [
      { "jwt": "..." },
      { "credential": { "type": ["VerifiableCredential","AcademicCredential"], "issuer": "...", "credentialSubject": {"name":"...","degree":"...","id":"did:key:..."}, "proof": {} } }
    ]
  }
  ```
  - Max 100 credentials per batch.

- **Response (200)**
  ```json
  {
    "success": true,
    "result": {
      "id": "bulk_...",
      "total": 0,
      "verified": 0,
      "failed": 0,
      "suspicious": 0,
      "completedAt": "2026-02-15T...Z",
      "results": [
        {
          "verificationId": "...",
          "status": "verified|failed|suspicious|pending",
          "riskScore": 0,
          "checks": [ {"name":"Credential Format","details": {"name":"..."}}, {"name":"Issuer Verification","details": {"issuerName":"..."}} ],
          "credentialSubject": {"name": "..."},
          "issuer": "..."
        }
      ]
    }
  }
  ```
- **UI mapping relies on:**
  - `data.result.results[]`
  - `verificationId`, `status`, `riskScore`
  - `checks[]` optionally providing candidate name/issuer via:
    - check name `Credential Format` → `details.name`
    - check name `Issuer Verification` → `details.issuerName`
  - fallback: `credentialSubject.name`, `issuer`
- **UI file:** `client/src/pages/BulkVerify.tsx`
- **Server:** `server/routes/verification.ts`

---

## 🟢 UI calls that require proxying to another service

### Claims dashboard
**GET** `/api/claims?period=today|week|month&limit=100`
- **UI file:** `client/src/pages/ClaimsDashboard.tsx`
- **Server:** Implemented as a thin proxy in `server/routes/claims-proxy.ts` (registered in `server/routes.ts`).
- **Upstream:** Wallet service `GET /api/v1/claims?limit=...` (requires `ALLOW_DEMO_ROUTES=true` in local demo).
- **Behavior:** Filters wallet claims by `created_at` to approximate `period` and reshapes response to `{ claims, stats }`.

---

## Notes / gotchas

- Legacy verify routes under `/api/verify/*` are explicitly marked deprecated via response headers:
  - `Deprecation: true`
  - `Sunset: <date>`
  - `Link: </api/v1/verifications>; rel="successor-version"`
  (implemented in `server/routes/verification.ts`).

- Newer authenticated APIs exist under `/api/v1/...` (OID4VP, proofs, verifications), but **Recruiter UI pages currently call the legacy `/api/verify/*` and `/api/verifications*` routes**.
