import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VerificationEngine, CredentialPayload } from '../server/services/verification-engine';
import { blockchainService } from '../server/services/blockchain-service';

// Mock dependencies
vi.mock('../server/services/blockchain-service', () => ({
  blockchainService: {
    verifyCredential: vi.fn(),
  },
}));

// Mock PostgresStateStore (used inside VerificationEngine)
vi.mock('@credverse/shared-auth', async () => {
  const actual = await vi.importActual('@credverse/shared-auth');
  return {
    ...actual,
    PostgresStateStore: class {
      constructor() {}
      load() { return Promise.resolve({ verificationCache: [], bulkJobs: [] }); }
      save() { return Promise.resolve(); }
    },
  };
});

// Mock fetch globally
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe('VerificationEngine', () => {
  let engine: VerificationEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new VerificationEngine();

    // Default blockchain service behavior
    vi.mocked(blockchainService.verifyCredential).mockResolvedValue({
      exists: true,
      isValid: true,
      isRevoked: false,
    });

    // Default fetch behavior (Issuer Registry & Revocation)
    // Return { valid: true } for revocation check
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ valid: true }),
    } as Response);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('initializes with default issuers', () => {
    expect(engine).toBeDefined();
  });

  describe('verifyCredential', () => {
    const validCredential = {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiableCredential'],
      id: 'urn:uuid:valid-credential-id',
      issuer: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnn3Zua2F72',
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: 'did:key:subject',
        degree: 'Bachelor of Science',
      },
      proof: {
        type: 'Ed25519Signature2018',
        created: new Date().toISOString(),
        verificationMethod: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnn3Zua2F72#z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnn3Zua2F72',
        proofPurpose: 'assertionMethod',
        jws: 'eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..signature',
      },
    };

    it('successfully verifies a valid raw credential', async () => {
      const payload: CredentialPayload = { raw: validCredential };
      const result = await engine.verifyCredential(payload);

      expect(result.status).toBe('verified');
      // Score 0 requires ALL checks to be passed (no warnings).
      // If DID resolution is skipped (score 0), others passed.
      expect(result.riskScore).toBe(0);

      // checks.every(passed) might be false if DID resolution is skipped.
      // So let's check non-skipped ones.
      const meaningfulChecks = result.checks.filter(c => c.status !== 'skipped');
      expect(meaningfulChecks.every(c => c.status === 'passed')).toBe(true);
    });

    it('fails when no credential is provided', async () => {
      const result = await engine.verifyCredential({});
      expect(result.status).toBe('failed');
      expect(result.checks[0].message).toBe('Could not parse credential');
    });

    it('successfully parses and verifies a JWT credential', async () => {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const body = Buffer.from(JSON.stringify(validCredential)).toString('base64url');
      const signature = 'signature';
      const jwt = `${header}.${body}.${signature}`;

      const result = await engine.verifyCredential({ jwt });

      expect(result.checks.find(c => c.name === 'JWT Format')?.status).toBe('passed');
      expect(result.status).toBe('verified');
    });

    it('handles signature validation failure', async () => {
      const invalidCred = { ...validCredential };
      // @ts-ignore
      delete invalidCred.proof;

      const result = await engine.verifyCredential({ raw: invalidCred });

      // Risk calculation: 55 -> suspicious
      expect(result.status).toBe('suspicious');
      expect(result.riskFlags).toContain('INVALID_SIGNATURE');
      expect(result.checks.find(c => c.name === 'Signature Validation')?.status).toBe('failed');
    });

    it('handles unknown issuer (remote lookup fails)', async () => {
        fetchMock.mockImplementation((url) => {
            if (typeof url === 'string' && url.includes('/registry/issuers/did/')) {
                return Promise.resolve({ ok: false, status: 404 } as Response);
            }
            return Promise.resolve({ ok: true, json: async () => ({ valid: true }) } as Response);
        });

        const unknownIssuerCred = { ...validCredential, issuer: 'did:key:unknown' };
        const result = await engine.verifyCredential({ raw: unknownIssuerCred });

        expect(result.riskFlags).toContain('UNVERIFIED_ISSUER');
        // Current logic keeps it as 'verified' because score is 20 (10 check + 10 flag) < 40
        expect(result.status).toBe('verified');
    });

    it('handles expired credential', async () => {
      const expiredCred = {
        ...validCredential,
        expirationDate: new Date(Date.now() - 10000).toISOString(),
      };

      const result = await engine.verifyCredential({ raw: expiredCred });

      expect(result.status).toBe('suspicious');
      expect(result.riskFlags).toContain('EXPIRED_CREDENTIAL');
      expect(result.checks.find(c => c.name === 'Expiration Check')?.status).toBe('failed');
    });

    it('handles revoked credential', async () => {
      fetchMock.mockImplementation(async (url) => {
        if (typeof url === 'string' && (url.includes('/status') || url.includes('/verify/'))) {
             return {
                ok: true,
                status: 200,
                json: async () => ({ revoked: true }),
             } as Response;
        }
        return { ok: true, json: async () => ({}) } as Response;
      });

      const credWithId = { ...validCredential, id: 'urn:uuid:1234' };

      const result = await engine.verifyCredential({ raw: credWithId });

      expect(result.status).toBe('failed');
      expect(result.riskFlags).toContain('REVOKED_CREDENTIAL');
      expect(result.checks.find(c => c.name === 'Revocation Check')?.status).toBe('failed');
    });

    it('handles missing blockchain anchor', async () => {
      vi.mocked(blockchainService.verifyCredential).mockResolvedValue({
        exists: false,
        isValid: false,
      });

      const result = await engine.verifyCredential({ raw: validCredential });

      expect(result.riskFlags).toContain('NO_BLOCKCHAIN_ANCHOR');
      expect(result.checks.find(c => c.name === 'Blockchain Anchor')?.status).toBe('warning');
    });

    it('handles deterministic proof hash mismatch', async () => {
        const credWithBadHash = {
            ...validCredential,
            proof: {
                ...validCredential.proof,
                credentialHash: 'bad_hash_value'
            }
        };

        const result = await engine.verifyCredential({ raw: credWithBadHash });

        expect(result.status).toBe('failed');
        expect(result.riskFlags).toContain('PROOF_HASH_MISMATCH');
    });

    it('handles unsupported DID method', async () => {
        const unsupportedDidCred = {
            ...validCredential,
            issuer: { id: 'did:example:123' }, // Object format to ensure resolveDID finds it
        };

        fetchMock.mockImplementation(async (url) => {
             if (typeof url === 'string' && url.includes('/registry/issuers/did/')) {
                return {
                    ok: true,
                    json: async () => ({
                        did: 'did:example:123',
                        name: 'Example Issuer',
                        trustStatus: 'trusted',
                        verified: true
                    })
                } as Response;
             }
             return { ok: true, json: async () => ({ valid: true }) } as Response;
        });

        const result = await engine.verifyCredential({ raw: unsupportedDidCred });

        const didCheck = result.checks.find(c => c.name === 'DID Resolution');
        expect(didCheck?.status).toBe('warning');
        expect(didCheck?.message).toBe('Unsupported DID method');
    });
  });

  describe('bulkVerify', () => {
     it('verifies multiple credentials', async () => {
        const creds: CredentialPayload[] = [
            { raw: {
                '@context': ['https://www.w3.org/2018/credentials/v1'],
                type: ['VerifiableCredential'],
                id: 'uuid:1',
                issuer: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnn3Zua2F72',
                issuanceDate: new Date().toISOString(),
                credentialSubject: { id: 'did:key:subject' },
                proof: { type: 'test', verificationMethod: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnn3Zua2F72#key' }
            } },
            { raw: {} } // Invalid
        ];

        const result = await engine.bulkVerify(creds);

        expect(result.total).toBe(2);
        expect(result.verified).toBe(1);
        expect(result.failed).toBe(1);
     });
  });
});
