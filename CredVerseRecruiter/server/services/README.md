# Fraud Detector Service

The `FraudDetector` service analyzes credentials for fraud indicators using a combination of deterministic rules and AI-powered anomaly detection.

## Credential Interface

The service uses a strictly typed `Credential` interface to ensure type safety when processing Verifiable Credentials (VCs) and JWTs.

```typescript
export interface Credential {
  issuer?: string | { id?: string; name?: string; [key: string]: unknown };
  iss?: string;
  issuanceDate?: string | number;
  iat?: number;
  expirationDate?: string | number;
  exp?: number;
  '@context'?: string | string[];
  context?: string | string[];
  type?: string | string[];
  credentialSubject?: { id?: string; name?: string; [key: string]: unknown } | string;
  sub?: string;
  [key: string]: unknown;
}
```

## Usage

```typescript
import { fraudDetector } from './fraud-detector';

const analysis = await fraudDetector.analyzeCredential(credentialPayload);

if (analysis.recommendation === 'reject') {
  // handle fraud
}
```

## Checks Performed

1.  **Issuer Analysis**: Validates issuer against known fraudulent lists and checks for DID format.
2.  **Temporal Anomalies**: Checks issuance dates (future dates, very old dates).
3.  **Content Patterns**: Scans for suspicious keywords (e.g., "test", "fake").
4.  **Format Consistency**: Validates compliance with W3C VC structure.
5.  **Subject Validation**: Ensures subject information is present.
6.  **AI Anomaly Detection**: Uses external AI providers (OpenAI, Gemini, DeepSeek) or a deterministic fallback to detect complex anomalies.
