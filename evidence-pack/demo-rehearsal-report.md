# Demo rehearsal report (local)

Date: 2026-02-16 (Asia/Calcutta)
Repo: `/Users/raghav/Desktop/credity`
Command: `npm run demo:local`

## 0) Environment / URLs

When `npm run demo:local` is running, modules come up on fixed ports:

- Gateway (jump page): http://localhost:5173
- Issuer Studio: http://localhost:5001
- Wallet: http://localhost:5002
- Recruiter Verify: http://localhost:5003

### Startup timing (observed)

From orchestrator logs:

- 01:13:26 — services spawned
- 01:13:34 — issuer/wallet/recruiter/gateway all healthy
- 01:13:35 — foundation seed gate finished (`[Gate] PASS`) and demo ready banner printed

Total time: ~9s to healthy, ~10s to fully seeded.

## 1) End-to-end story (what the live demo should do)

Target narrative: **Issuer issues → generates offer → Wallet claims → selective disclosure share → Recruiter verifies (fraud-first)**.

### A. Issuer: Issue credential + auto-generate offer URL

UI path (Issuer Studio):

1. Open http://localhost:5001
2. Click **Issue Credentials**
3. In _Single Issuance_:
   - Sector: **Education (University)**
   - Template: **Degree Certificate 2025**
   - Recipient Name: `Demo Candidate`
   - Email: `demo@credverse.test` (optional for local; email is mocked)
   - ID/Reference: `UNI-DEMO-001`
   - Major: `Computer Science`
4. Click **Issue Credential**
5. Wait for toast: **“Wallet URL (copied!)”**
   - This toast is produced by `POST /api/v1/credentials/:id/offer` and copies `offerUrl` to clipboard.

Backend behavior (confirmed in code): issuer client auto-creates offer on success and attempts `navigator.clipboard.writeText(offerUrl)`.

### B. Wallet: Claim offer (Receive) and confirm credential is added

UI path (Wallet):

1. Open http://localhost:5002
2. Log in (or use the seeded demo user from the gate run)
3. Go to **Receive Credential**
4. Paste the Issuer offer URL (from clipboard) and click the arrow button
5. Confirm toast: **Credential Received**
6. Navigate to **Credentials** and open the newly added credential

Note: wallet claim API is protected (401 without token). The UI works because you have an authenticated session.

### C. Wallet: Selective disclosure share

UI path:

1. From a credential detail page, click **Share**
2. In **Selective Disclosure** tab:
   - Set expiry to **30 minutes**
   - Select only a subset of fields (e.g. `credentialName`, `major`) leaving others undisclosed
3. Click **Generate Secure Share**
4. Copy the generated share URL (looks like `http://localhost:5002/verify/<token>`)

Backend behavior (confirmed): `POST /api/wallet/share` returns `shareUrl` = `${WALLET_BASE_URL}/verify/${token}`.

### D. Recruiter: Verify (fraud-first)

UI path:

1. Open http://localhost:5003
2. Log in as recruiter
3. Open **Instant Verify**
4. **Fraud-first beat (optional but recommended):**
   - Paste a _tampered_ JWT into the **JWT** tab and click **Verify JWT**
   - Call out that it fails signature / trust checks and surfaces reason codes.
5. **Happy path:**
   - Switch to **Link** tab
   - Paste the Wallet share link (`/verify/<token>`) and click **Verify Link**
   - Call out:
     - issuer trust (Demo University)
     - signature status / reason codes
     - revocation status (if applicable)
     - anchor status (local runs in deferred mode; expect “pending / not anchored” warnings)
     - disclosed fields visible (others hidden)

Important: `/api/verify/link` is protected by `requireProofAccess`, so recruiter must be logged in.

## 2) Evidence from this rehearsal

### Foundation seed gate (automatic)

`npm run demo:local` runs `scripts/foundation-e2e-gate.mjs` after health checks.
Observed output included:

- `[Gate] Starting foundation flow: Issue -> Claim -> Present -> Verify -> Revoke`
- `[Gate] PASS`

This confirms the **service mesh + core APIs** work end-to-end on localhost.

### Selective disclosure link creation (observed)

Wallet successfully created a share link:

- `POST /api/wallet/share` → 200 with `shareUrl` like `http://localhost:5002/verify/<token>`

Recruiter verification of the link returned **401** when called without recruiter auth (expected).

## 3) Flaky / risky steps identified

### (1) Biometrics prompts can derail live demo

Both Wallet **Receive** and **Share** flows call `verifyBiometrics('1')`.
On machines with Touch ID / platform authenticators, WebAuthn can trigger modal prompts that:

- interrupt the flow
- get cancelled accidentally
- vary by browser profile

**Mitigation implemented (PR-ready):** added a demo kill-switch:

- Env: `VITE_DISABLE_BIOMETRICS=true`
- Or runtime: `localStorage.setItem('disable_biometrics','1')`

When enabled, wallet biometrics returns success immediately.

### (2) Registration rate limiting (local)

Wallet `/api/auth/register` began returning **429 Too many registration attempts** during repeated scripted runs.

Mitigation for demos:

- Reuse an existing demo account (seeded by the gate), OR
- Restart services between rehearsals to reset in-memory counters.

### (3) Anchor / signature warnings in local mode

Local runs frequently show:

- **Blockchain anchor** warnings (deferred mode)
- **Signature validation** failures in some OID4VP response checks

These are useful for a **fraud-first** story, but if you want a clean “all green” happy path, we should:

- ensure the selected verification pathway uses the engine that validates signatures for the credential format being presented
- or switch local mode to a deterministic “signed + verifiable” fixture.

## 4) 5-minute live demo script (talk track)

**0:00–0:30 — Set the frame**

- “Credity is a trust rail for hiring: issuer → holder-controlled sharing → recruiter verification with policy + fraud signals.”
- “Everything is standards-aligned and audit-friendly.”

**0:30–2:00 — Issuer issues + generates offer**

- Open Issuer Studio.
- “Institutions issue credentials. When I click Issue, we generate a verifiable credential and create an OID4VCI offer URL.”
- Click Issue.
- “The wallet link is copied—this is the handoff mechanism.”

**2:00–3:00 — Wallet claims**

- Open Wallet → Receive.
- Paste offer URL → Claim.
- “Now the credential is in the holder’s wallet. The holder controls sharing—no recruiter portal access to the issuer DB.”

**3:00–4:00 — Selective disclosure**

- Open credential → Share.
- Select only a couple fields.
- “Unselected fields are hidden; we share only what’s required for the verification context.”
- Generate share link.

**4:00–5:00 — Recruiter verifies (fraud-first)**

- Open Recruiter Verify → Instant Verify.
- “We verify cryptography, issuer trust, revocation, and anchoring signals—and we surface reason codes.”
- Paste share link and verify.
- “This is how a recruiter gets fast signal, without collecting excess personal data.”

## 5) 1-minute fallback script (if UI glitches)

- “I’ll show the system is healthy and the trust rails are live.”
- Run/point to `npm run demo:local` terminal:
  - show all services healthy
  - show `[Gate] PASS` confirming issue→claim→verify path works
- Open gateway page (http://localhost:5173) and click through module links.
- “The UI is just one surface; the core value is the verifiable, auditable flow behind it.”

## 6) Changes made (PR-ready)

### Wallet: Add biometrics disable kill-switch

File modified:

- `BlockWalletDigi/client/src/hooks/use-biometrics.ts`

Behavior:

- If `VITE_DISABLE_BIOMETRICS=true` **or** `localStorage.disable_biometrics === '1'`, biometrics enrollment/verification short-circuits to success.

Recommended for demos and CI.
