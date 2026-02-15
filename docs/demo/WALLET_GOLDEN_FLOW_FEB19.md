# Wallet / Consumer Golden Flow (Fraud-first trust layer) — Demo Runbook (Feb 19)

This runbook is **deterministic** and uses real API surfaces already in the repo.

## Services
Local (defaults used across repo):
- Gateway: http://localhost:5173
- Issuer: http://localhost:5001
- Wallet: http://localhost:5002
- Recruiter: http://localhost:5003

Start all services using the repo’s existing "gate" scripts / dev commands.

## Seed: Issue a credential + generate a wallet offer URL

1) Issue a credential (Issuer → create credential record)

```bash
curl -sS -X POST "http://localhost:5001/api/v1/credentials/issue" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${ISSUER_API_KEY:-test-api-key}" \
  -d '{
    "tenantId": "550e8400-e29b-41d4-a716-446655440000",
    "templateId": "template-1",
    "issuerId": "issuer-1",
    "recipient": {"email": "holder@demo.test", "name": "Demo Holder"},
    "credentialData": {"credentialName": "Degree Certificate 2025", "scenario": "feb19-demo", "issuedAt": "'"$(date -Iseconds)"'"}
  }' | jq .
```

Capture the returned credential `id`.

2) Generate an offer URL (Issuer → public offer consume URL)

```bash
CRED_ID=<paste-credential-id>
curl -sS -X POST "http://localhost:5001/api/v1/credentials/${CRED_ID}/offer" \
  -H "X-API-Key: ${ISSUER_API_KEY:-test-api-key}" | jq -r .offerUrl
```

This `offerUrl` is what the **Wallet app** will claim.

## Golden path in Mobile

### Holder
1) Login as **Holder**.
2) Open **Holder Wallet** → **Claim credential offer**.
3) Paste the `offerUrl` from above → **Claim & store**.
   - Trust signals should populate on the stored credential (issuer, proof metadata, anchor code).
4) Tap the credential under **Credentials** to open **Credential Detail**.
5) Tap **Selective disclose (recruiter package)**.
6) Select a few fields to reveal (keep it minimal).
7) Tap **Generate package**.
8) Copy the generated JSON payload (it is a `credverse.recruiter_package.v1`).

### Recruiter
1) Switch role to **Recruiter**.
2) In **Instant Verification**, paste the JSON from the holder (or a JWT).
3) Tap **Verify**.
   - The recruiter verification engine will evaluate issuer verification + revocation + anchor consistency.

## Talk track: “Fraud-first trust layer”
- **Verified issuer** (registry lookup) → reduces spoofing.
- **Deterministic proof hash** → makes tampering visible and auditable.
- **Anchor / deferred mode** → clearly distinguishes on-chain vs pending.
- **Selective disclosure** → share only what’s needed; consent is logged.

## Troubleshooting
- If claim fails: ensure Issuer `/api/v1/public/issuance/offer/consume?token=...` is reachable.
- If verification fails: use the generated recruiter JSON payload (not the QR payload) or paste a VC-JWT directly.
