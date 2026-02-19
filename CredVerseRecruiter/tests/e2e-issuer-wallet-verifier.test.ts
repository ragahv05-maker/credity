import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import express from 'express';
import { createServer, type Server } from 'http';
import request from 'supertest';

import { registerRoutes as registerIssuerRoutes } from '../../CredVerseIssuer 3/server/routes';
import { registerRoutes as registerWalletRoutes } from '../../BlockWalletDigi/server/routes';
import { registerRoutes as registerVerifierRoutes } from '../server/routes';
import { blockchainService as issuerBlockchainService } from '../../CredVerseIssuer 3/server/services/blockchain-service';
import { generateAccessToken as generateIssuerAccessToken } from '@credverse/shared-auth';
import { generateAccessToken as generateVerifierAccessToken } from '../server/services/auth-service';
import { generateAccessToken as generateWalletAccessToken } from '../../BlockWalletDigi/server/services/auth-service';

type ChainMode = 'active' | 'deferred' | 'writes-disabled';

describe('issuer -> wallet -> verifier cross-service e2e', () => {
  let issuerApp: express.Express;
  let walletApp: express.Express;
  let verifierApp: express.Express;
  let issuerServer: Server;

  const issuerApiKey = process.env.ISSUER_BOOTSTRAP_API_KEY || 'test-api-key';
  const verifierToken = generateVerifierAccessToken({ id: '1', username: 'verifier', role: 'recruiter' });
  const verifierWrongRoleToken = generateVerifierAccessToken({ id: '2', username: 'issuer-user', role: 'issuer' });
  const walletToken = generateWalletAccessToken({ id: 1, username: 'holder', role: 'holder' });
  const issuerBearerToken = generateIssuerAccessToken({ id: 'issuer-e2e', username: 'issuer-e2e', role: 'issuer' });

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.ISSUER_BOOTSTRAP_API_KEY = issuerApiKey;

    issuerApp = express();
    issuerApp.use(express.json());
    issuerServer = createServer(issuerApp);
    await registerIssuerRoutes(issuerServer, issuerApp);
    await new Promise<void>((resolve) => issuerServer.listen(5001, '127.0.0.1', () => resolve()));

    walletApp = express();
    walletApp.use(express.json());
    const walletServer = createServer(walletApp);
    await registerWalletRoutes(walletServer, walletApp);

    verifierApp = express();
    verifierApp.use(express.json());
    const verifierServer = createServer(verifierApp);
    await registerVerifierRoutes(verifierServer, verifierApp);
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await new Promise<void>((resolve, reject) =>
      issuerServer.close((err) => (err ? reject(err) : resolve())),
    );
  });

  function mockChainMode(mode: ChainMode): void {
    const stateByMode = {
      active: { configured: true, writesAllowed: true, writePolicyReason: undefined, chainNetwork: 'polygon-amoy', chainId: 80002, networkName: 'polygon-amoy' },
      deferred: { configured: false, writesAllowed: true, writePolicyReason: undefined, chainNetwork: 'polygon-amoy', chainId: 80002, networkName: 'polygon-amoy' },
      'writes-disabled': { configured: true, writesAllowed: false, writePolicyReason: 'policy-test', chainNetwork: 'polygon-amoy', chainId: 80002, networkName: 'polygon-amoy' },
    } as const;

    vi.spyOn(issuerBlockchainService, 'getRuntimeStatus').mockReturnValue(stateByMode[mode]);
  }

  async function issueOfferClaim(params: {
    mode: ChainMode;
    auth: { kind: 'apiKey'; key: string } | { kind: 'bearer'; token: string };
    suffix: string;
  }): Promise<{ storedCredential: Record<string, unknown>; proof: Record<string, unknown> }> {
    mockChainMode(params.mode);

    const issueUrl = params.auth.kind === 'bearer'
      ? 'http://127.0.0.1:5001/api/v1/credentials/issue?tenantId=550e8400-e29b-41d4-a716-446655440000'
      : 'http://127.0.0.1:5001/api/v1/credentials/issue';

    const issueReq = fetch(issueUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(params.auth.kind === 'apiKey'
          ? { 'x-api-key': params.auth.key }
          : { Authorization: `Bearer ${params.auth.token}` }),
      },
      body: JSON.stringify({
        templateId: 'template-1',
        issuerId: 'issuer-1',
        recipient: {
          name: `E2E Candidate ${params.suffix}`,
          email: `e2e+${params.suffix}@example.com`,
          studentId: `E2E-${params.suffix}`,
        },
        credentialData: {
          credentialName: 'Bachelor of Technology',
          major: 'Computer Science',
          grade: 'A',
        },
      }),
    });

    const issueHttpRes = await issueReq;
    const issueRes = await issueHttpRes.json() as Record<string, unknown>;
    expect(issueHttpRes.status, JSON.stringify(issueRes)).toBe(201);
    expect(issueRes.id).toBeTruthy();

    const offerUrl = params.auth.kind === 'bearer'
      ? `http://127.0.0.1:5001/api/v1/credentials/${issueRes.id as string}/offer?tenantId=550e8400-e29b-41d4-a716-446655440000`
      : `http://127.0.0.1:5001/api/v1/credentials/${issueRes.id as string}/offer`;

    const offerHttpRes = await fetch(offerUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(params.auth.kind === 'apiKey'
          ? { 'x-api-key': params.auth.key }
          : { Authorization: `Bearer ${params.auth.token}` }),
      },
      body: JSON.stringify({}),
    });

    const offerRes = await offerHttpRes.json() as Record<string, unknown>;
    expect(offerHttpRes.status).toBe(200);
    expect(String(offerRes.offerUrl)).toContain('/api/v1/public/issuance/offer/consume?token=');

    const claimRes = await request(walletApp)
      .post('/api/v1/wallet/offer/claim')
      .set('Authorization', `Bearer ${walletToken}`)
      .send({ userId: 1, url: String(offerRes.offerUrl) });

    expect(claimRes.status).toBe(200);
    expect(claimRes.body.code).toBe('OFFER_CLAIMED');

    return {
      storedCredential: claimRes.body.credential?.data,
      proof: claimRes.body.proof,
    };
  }

  it('supports issuer auth permutations (missing, invalid, apiKey, bearer)', async () => {
    const noAuthRes = await fetch('http://127.0.0.1:5001/api/v1/credentials/issue', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ templateId: 'template-1', issuerId: 'issuer-1', recipient: {}, credentialData: {} }),
    });
    expect(noAuthRes.status).toBe(401);

    const invalidApiKeyRes = await fetch('http://127.0.0.1:5001/api/v1/credentials/issue', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': 'invalid-key' },
      body: JSON.stringify({ templateId: 'template-1', issuerId: 'issuer-1', recipient: {}, credentialData: {} }),
    });
    expect(invalidApiKeyRes.status).toBe(401);

    const apiKeyFlow = await issueOfferClaim({
      mode: 'active',
      auth: { kind: 'apiKey', key: issuerApiKey },
      suffix: 'api-key',
    });
    expect(apiKeyFlow.storedCredential).toBeTruthy();

    const bearerFlow = await issueOfferClaim({
      mode: 'active',
      auth: { kind: 'bearer', token: issuerBearerToken },
      suffix: 'bearer',
    });
    expect(bearerFlow.storedCredential).toBeTruthy();
  });

  it('covers blockchain proof modes deterministically (active, deferred, writes-disabled)', async () => {
    const expectations: Record<ChainMode, { deferred: boolean; code: string }> = {
      active: { deferred: false, code: 'BLOCKCHAIN_ACTIVE' },
      deferred: { deferred: true, code: 'BLOCKCHAIN_DEFERRED_MODE' },
      'writes-disabled': { deferred: true, code: 'BLOCKCHAIN_WRITES_DISABLED' },
    };

    for (const mode of Object.keys(expectations) as ChainMode[]) {
      const { storedCredential, proof } = await issueOfferClaim({
        mode,
        auth: { kind: 'apiKey', key: issuerApiKey },
        suffix: `mode-${mode}`,
      });

      expect(storedCredential).toBeTruthy();
      expect(proof.deferred).toBe(expectations[mode].deferred);
      expect(proof.code).toBe(expectations[mode].code);
    }
  });

  it('runs verifier success/failure path plus auth permutations', async () => {
    const { storedCredential } = await issueOfferClaim({
      mode: 'active',
      auth: { kind: 'apiKey', key: issuerApiKey },
      suffix: 'verify',
    });

    const noAuthMetadata = await request(verifierApp)
      .post('/api/v1/proofs/metadata')
      .send({ credential: storedCredential });
    expect(noAuthMetadata.status).toBe(401);
    expect(noAuthMetadata.body.code).toBe('PROOF_AUTH_REQUIRED');

    const wrongRoleMetadata = await request(verifierApp)
      .post('/api/v1/proofs/metadata')
      .set('Authorization', `Bearer ${verifierWrongRoleToken}`)
      .send({ credential: storedCredential });
    expect(wrongRoleMetadata.status).toBe(403);
    expect(wrongRoleMetadata.body.code).toBe('PROOF_FORBIDDEN');

    const metadataRes = await request(verifierApp)
      .post('/api/v1/proofs/metadata')
      .set('Authorization', `Bearer ${verifierToken}`)
      .send({ credential: storedCredential, hash_algorithm: 'sha256' });

    expect(metadataRes.status).toBe(200);
    expect(metadataRes.body.code).toBe('PROOF_METADATA_READY');

    const verifyOkRes = await request(verifierApp)
      .post('/api/v1/proofs/verify')
      .set('Authorization', `Bearer ${verifierToken}`)
      .send({
        format: 'ldp_vc',
        proof: storedCredential,
        expected_hash: metadataRes.body.hash,
        hash_algorithm: 'sha256',
      });

    expect(verifyOkRes.status).toBe(200);
    expect(verifyOkRes.body.valid).toBe(true);
    expect(verifyOkRes.body.code).toBe('PROOF_VALID');

    const verifyMismatchRes = await request(verifierApp)
      .post('/api/v1/proofs/verify')
      .set('Authorization', `Bearer ${verifierToken}`)
      .send({
        format: 'ldp_vc',
        proof: storedCredential,
        expected_hash: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
        hash_algorithm: 'sha256',
      });

    expect(verifyMismatchRes.status).toBe(200);
    expect(verifyMismatchRes.body.valid).toBe(false);
    expect(verifyMismatchRes.body.reason_codes).toContain('PROOF_HASH_MISMATCH');
    expect(verifyMismatchRes.body.code).toBe('PROOF_HASH_MISMATCH');
  });
});
