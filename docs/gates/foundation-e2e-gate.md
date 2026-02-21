# Foundation E2E Gate

## Goal

Validate the critical lifecycle flow end-to-end:

`Issue -> Claim -> Present -> Verify -> Revoke`

## Script

Run from repo root:

```bash
npm run gate:foundation
```

To run end-to-end locally without manually booting each service:

```bash
npm run gate:foundation:local
```

This executes `scripts/foundation-e2e-gate.mjs` and verifies:

- OID4VCI offer/token/credential issuance
- wallet claim/store path
- OID4VP request/response path
- instant verification path
- revoke + post-revoke status

## Required Services

- Issuer (`http://localhost:5001` by default)
- Wallet (`http://localhost:5002` by default)
- Recruiter (`http://localhost:5003` by default)
- Gateway (`http://localhost:5173` for mobile proxy health check in local orchestration)

## Environment Overrides

- `ISSUER_BASE_URL`
- `WALLET_BASE_URL`
- `RECRUITER_BASE_URL`
- `E2E_ISSUER_API_KEY`
- `E2E_TENANT_ID`
- `E2E_TEMPLATE_ID`
- `E2E_ISSUER_ID`
- `E2E_WALLET_USER_ID`

## Notes

- Default seed values target current local dev defaults.
- This is a release gate script and should be run against staging before external pilot rollouts.
