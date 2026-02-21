# CredVerse Wallet API Documentation

## Base URL

```
http://localhost:5002/api
```

## Authentication

Most endpoints require JWT authentication. Include the access token in the Authorization header:

```
Authorization: Bearer <access_token>
```

---

## Auth Endpoints

### POST /auth/register

Register a new user account.

**Request Body:**

```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securepassword123",
  "name": "John Doe"
}
```

**Response:**

```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "john_doe",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "tokens": {
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG...",
    "expiresIn": 900
  }
}
```

---

### POST /auth/login

Login with username and password.

**Request Body:**

```json
{
  "username": "john_doe",
  "password": "securepassword123"
}
```

**Response:**

```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "john_doe",
    "did": "did:key:z..."
  },
  "tokens": {
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG...",
    "expiresIn": 900
  }
}
```

---

### POST /auth/refresh

Refresh access token using refresh token.

**Request Body:**

```json
{
  "refreshToken": "eyJhbG..."
}
```

---

### POST /auth/logout

Logout and invalidate tokens.

**Headers:** `Authorization: Bearer <access_token>`

---

## Wallet Endpoints

### POST /wallet/init

Initialize wallet for a user. Creates DID if not exists.

**Request Body:**

```json
{
  "userId": 1
}
```

**Response:**

```json
{
  "success": true,
  "wallet": {
    "did": "did:key:zStERvo...",
    "credentialCount": 3,
    "initialized": true
  },
  "stats": {
    "totalCredentials": 3,
    "byCategory": { "academic": 1, "employment": 1, "skill": 1 }
  }
}
```

---

### GET /wallet/credentials

List all credentials in wallet.

**Query Params:**

- `userId` - User ID
- `category` - Optional filter (academic, employment, skill, government)

---

### POST /wallet/credentials

Store a new credential.

**Request Body:**

```json
{
  "userId": 1,
  "credential": {
    "type": ["VerifiableCredential", "UniversityDegree"],
    "issuer": "Stanford University",
    "issuanceDate": "2024-01-15T00:00:00Z",
    "data": {
      "name": "Bachelor of Computer Science",
      "recipient": "John Doe"
    },
    "category": "academic"
  }
}
```

---

### POST /wallet/share

Create a shareable link for a credential.

**Request Body:**

```json
{
  "userId": 1,
  "credentialId": "cred-123",
  "shareType": "link",
  "disclosedFields": ["name", "issuer"],
  "expiryMinutes": 60
}
```

**Response:**

```json
{
  "success": true,
  "share": {
    "id": "share-456",
    "token": "abc123...",
    "expiry": "2024-01-15T02:00:00Z"
  },
  "shareUrl": "http://localhost:5002/verify/abc123..."
}
```

---

### GET /verify/:token

Verify a shared credential (public endpoint).

**Response:**

```json
{
  "valid": true,
  "credential": {
    "type": ["VerifiableCredential", "UniversityDegree"],
    "issuer": "Stanford University",
    "data": {
      "name": "Bachelor of Computer Science"
    }
  },
  "verification": {
    "status": "verified",
    "timestamp": "2024-01-15T00:00:00Z",
    "blockchain": true
  }
}
```

---

## Inbox Endpoints (Credential Push)

### GET /inbox

Get pending credential offers.

**Query Params:** `userId`

**Response:**

```json
{
  "offers": [
    {
      "id": "offer_123",
      "issuer": "Stanford University",
      "preview": {
        "type": ["VerifiableCredential", "Degree"],
        "name": "Computer Science Degree"
      },
      "expiresAt": "2024-01-18T00:00:00Z"
    }
  ],
  "count": 1
}
```

---

### POST /inbox/:offerId/accept

Accept a credential offer.

**Request Body:**

```json
{
  "userId": 1
}
```

---

### POST /inbox/:offerId/reject

Reject a credential offer.

---

### POST /push

Push a credential to a wallet (for issuers).

**Request Body:**

```json
{
  "issuerId": "issuer-123",
  "issuerName": "Stanford University",
  "recipientDid": "did:key:z...",
  "credential": {
    "type": ["VerifiableCredential", "Degree"],
    "data": {...}
  },
  "expiryHours": 72
}
```

---

## DigiLocker Endpoints

### GET /digilocker/auth

Get OAuth authorization URL.

**Query Params:** `userId`

---

### GET /digilocker/status

Check connection status.

---

### GET /digilocker/documents

List available documents.

---

### POST /digilocker/import

Import a single document.

**Request Body:**

```json
{
  "userId": 1,
  "documentUri": "in.gov.uidai-ADHAR-1234",
  "documentType": "ADHAR",
  "documentName": "Aadhaar Card",
  "issuer": "UIDAI"
}
```

---

### POST /digilocker/import-all

Import all available documents.

---

## Backup & Recovery

### POST /wallet/backup

Create encrypted wallet backup.

**Response:**

```json
{
  "success": true,
  "backupData": "encrypted_base64_data...",
  "backupKey": "32_byte_hex_key...",
  "warning": "Store your backup key securely."
}
```

---

### POST /wallet/restore

Restore wallet from backup.

**Request Body:**

```json
{
  "userId": 1,
  "backupData": "encrypted_base64_data...",
  "backupKey": "32_byte_hex_key..."
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message here"
}
```

| Status Code | Meaning      |
| ----------- | ------------ |
| 400         | Bad Request  |
| 401         | Unauthorized |
| 403         | Forbidden    |
| 404         | Not Found    |
| 429         | Rate Limited |
| 500         | Server Error |
