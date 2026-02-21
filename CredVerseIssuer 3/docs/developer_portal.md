# CredVerse Developer Portal

Welcome to the CredVerse Issuer API documentation. This API allows institutions to issue Verifiable Credentials and verifiers to check issuer legitimacy.

## Base URL

`http://localhost:5001/api/v1`

## Key Integration Flows

### 1. Verifying an Issuer

To verify if an issuer DID is trusted by the CredVerse Registry:

```http
GET /public/registry/issuers/did/{did}
```

**Response:**

```json
{
  "id": "1",
  "name": "CredVerse University",
  "did": "did:web:issuer.credverse.io",
  "trustStatus": "trusted"
}
```

### 2. Consuming an Offer (Wallet Integration)

Wallets receiving a Deep Link or QR Code with `?token=xyz` should call:

```http
GET /public/issuance/offer/consume?token=xyz
```

This returns the full raw credential and the VC-JWT signed by the issuer.

### 3. Issuing Credentials (Issuer Integration)

1. Authenticate via `/auth/login` to get Bearer token.
2. Call `/issuance/credentials/issue` with recipient data.
3. Call `/issuance/credentials/{id}/offer` to generate a shareable link.

## Authentication

Protected endpoints require `Authorization: Bearer <token>`.

## Error Codes

- `400`: Bad Request (Validation)
- `401`: Unauthorized
- `403`: Forbidden (Tenant mismatch)
- `404`: Not Found
