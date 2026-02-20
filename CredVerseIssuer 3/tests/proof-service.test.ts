import { describe, expect, it } from 'vitest';
import { generateProof, ProofGenerationError } from '../server/services/proof-service';
import { deterministicHashLegacyTopLevel } from '../server/services/proof-lifecycle';

describe('issuer proof-service', () => {
  it('generates executable merkle-membership proof envelope', () => {
    const result = generateProof({
      request: {
        format: 'merkle-membership',
        credential_id: 'cred-1',
        challenge: 'challenge-1',
        domain: 'recruiter.credity.example',
      },
      credential: {
        id: 'cred-1',
        issuerDid: 'did:key:issuer-1',
        subjectDid: 'did:key:subject-1',
        credentialData: { credentialSubject: { id: 'did:key:subject-1', degree: 'B.Tech' } },
      },
      issuerBaseUrl: 'https://issuer.credity.example',
    });

    expect(result.status).toBe('generated');
    expect(result.format).toBe('merkle-membership');
    expect((result.proof as any).verification_contract).toBe('credity-proof-verification/v1');
    expect((result.proof as any).leaf_hash).toBeTypeOf('string');
    expect((result.public_signals as any).leaf_hash).toBe((result.proof as any).leaf_hash);
  });

  it('returns unsupported with explicit integration requirement reason for non-enabled proof formats', () => {
    const result = generateProof({
      request: { format: 'sd-jwt-vc', credential_id: 'cred-1' },
      credential: { id: 'cred-1' },
    });

    expect(result.status).toBe('unsupported');
    expect(result.proof).toBeNull();
    expect(String(result.reason || '')).toContain('requires a production prover integration');
  });

  it('throws deterministic error when credential is missing for merkle-membership', () => {
    expect(() =>
      generateProof({
        request: { format: 'merkle-membership', credential_id: 'cred-x' },
        credential: null,
      }),
    ).toThrowError(ProofGenerationError);

    try {
      generateProof({
        request: { format: 'merkle-membership', credential_id: 'cred-x' },
        credential: null,
      });
    } catch (error: any) {
      expect(error.code).toBe('PROOF_CREDENTIAL_NOT_FOUND');
    }
  });

  it('keeps signing source-of-truth strict when generating claims digest', () => {
    const credentialData = {
      top: 'x',
      nested: { b: 2, a: 1 },
      arr: [{ z: 3, a: 1 }],
    };

    const result = generateProof({
      request: {
        format: 'merkle-membership',
        credential_id: 'cred-strict-1',
      },
      credential: {
        id: 'cred-strict-1',
        credentialData,
      },
      issuerBaseUrl: 'https://issuer.credity.example',
    });

    const proof = result.proof as any;
    const legacyDigest = deterministicHashLegacyTopLevel(credentialData, 'sha256');

    expect(proof.canonicalization).toBe('RFC8785-V1');
    expect(proof.claims_digest).toBeTypeOf('string');
    expect(proof.claims_digest).not.toBe(legacyDigest);
  });
});
