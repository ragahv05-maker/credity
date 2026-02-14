import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import express from 'express';
import { createServer, type Server } from 'http';
import request from 'supertest';
import { ethers } from 'ethers';

const runSepoliaSmoke = process.env.RUN_SEPOLIA_SMOKE === 'true';
const describeSepolia = runSepoliaSmoke ? describe : describe.skip;

describeSepolia('sepolia smoke: issue -> claim -> verify', () => {
  let issuerApp: express.Express;
  let walletApp: express.Express;
  let verifierApp: express.Express;
  let issuerServer: Server;

  const issuerApiKey = process.env.ISSUER_BOOTSTRAP_API_KEY || 'test-api-key';
  const deployerKey = process.env.SEPOLIA_SMOKE_RELAYER_PRIVATE_KEY || process.env.RELAYER_PRIVATE_KEY || '';
  const registryContract = process.env.SEPOLIA_SMOKE_REGISTRY_CONTRACT_ADDRESS || process.env.REGISTRY_CONTRACT_ADDRESS || '0x6060250FC92538571adde5c66803F8Cbe77145a1';

  let walletToken = '';
  let verifierToken = '';

  beforeAll(async () => {
    if (!deployerKey) {
      throw new Error('Missing RELAYER_PRIVATE_KEY (or SEPOLIA_SMOKE_RELAYER_PRIVATE_KEY) for Sepolia smoke test');
    }

    process.env.NODE_ENV = 'test';
    process.env.ISSUER_BOOTSTRAP_API_KEY = issuerApiKey;
    process.env.CHAIN_NETWORK = 'ethereum-sepolia';
    process.env.BLOCKCHAIN_ANCHOR_MODE = 'sync';
    process.env.REGISTRY_CONTRACT_ADDRESS = registryContract;
    process.env.RELAYER_PRIVATE_KEY = deployerKey;
    process.env.SEPOLIA_RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com';

    const [{ registerRoutes: registerIssuerRoutes }, { registerRoutes: registerWalletRoutes }, { registerRoutes: registerVerifierRoutes }, sharedAuth, recruiterAuth] = await Promise.all([
      import('../../CredVerseIssuer 3/server/routes'),
      import('../../BlockWalletDigi/server/routes'),
      import('../server/routes'),
      import('@credverse/shared-auth'),
      import('../server/services/auth-service'),
    ]);

    walletToken = sharedAuth.generateAccessToken({ id: 1, username: 'holder-smoke', role: 'holder' });
    verifierToken = recruiterAuth.generateAccessToken({ id: 'verifier-smoke', username: 'verifier-smoke', role: 'recruiter' });

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
  }, 60_000);

  afterAll(async () => {
    if (!issuerServer) return;
    await new Promise<void>((resolve, reject) =>
      issuerServer.close((err) => (err ? reject(err) : resolve())),
    );
  });

  it('anchors on-chain and verifies proof path', async () => {
    const suffix = `smoke-${Date.now()}`;

    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com');

    const issueHttpRes = await fetch('http://127.0.0.1:5001/api/v1/credentials/issue', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': issuerApiKey,
      },
      body: JSON.stringify({
        templateId: 'template-1',
        issuerId: 'issuer-1',
        recipient: {
          name: `Smoke Candidate ${suffix}`,
          email: `smoke+${suffix}@example.com`,
          studentId: `SMOKE-${suffix}`,
        },
        credentialData: {
          credentialName: 'Bachelor of Technology',
          major: 'Computer Science',
          grade: 'A',
        },
      }),
    });

    const issueRes = await issueHttpRes.json() as Record<string, any>;
    expect(issueHttpRes.status).toBe(201);
    expect(issueRes.id).toBeTruthy();

    const offerHttpRes = await fetch(`http://127.0.0.1:5001/api/v1/credentials/${issueRes.id as string}/offer`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': issuerApiKey,
      },
      body: JSON.stringify({}),
    });

    const offerRes = await offerHttpRes.json() as Record<string, any>;
    expect(offerHttpRes.status).toBe(200);
    expect(String(offerRes.offerUrl)).toContain('/api/v1/public/issuance/offer/consume?token=');

    const claimRes = await request(walletApp)
      .post('/api/v1/wallet/offer/claim')
      .set('Authorization', `Bearer ${walletToken}`)
      .send({ userId: 1, url: String(offerRes.offerUrl) });

    expect(claimRes.status).toBe(200);
    expect(claimRes.body.code).toBe('OFFER_CLAIMED');

    const proof = claimRes.body.proof || {};
    const storedCredential = claimRes.body.credential?.data || {};

    const rawTxHash = proof.txHash || storedCredential.txHash;
    const txHash = typeof rawTxHash === 'string' ? rawTxHash : (rawTxHash?.hash || rawTxHash?.txHash || '');
    expect(txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);

    const metadataRes = await request(verifierApp)
      .post('/api/v1/proofs/metadata')
      .set('Authorization', `Bearer ${verifierToken}`)
      .send({ credential: storedCredential, hash_algorithm: 'sha256' });

    expect(metadataRes.status).toBe(200);
    expect(metadataRes.body.code).toBe('PROOF_METADATA_READY');

    const verifyRes = await request(verifierApp)
      .post('/api/v1/proofs/verify')
      .set('Authorization', `Bearer ${verifierToken}`)
      .send({
        format: 'ldp_vc',
        proof: storedCredential,
        expected_hash: metadataRes.body.hash,
        hash_algorithm: 'sha256',
      });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.valid).toBe(true);
    expect(verifyRes.body.code).toBe('PROOF_VALID');

    const receipt = await provider.getTransactionReceipt(txHash as string);
    expect(receipt).toBeTruthy();
    expect(Number(receipt!.status)).toBe(1);

    const proofHash = proof.hash || proof.credentialHash;
    if (proofHash) {
      try {
        const contract = new ethers.Contract(
          registryContract,
          ['function verifyCredential(bytes32 _credentialHash) external view returns (bool isValid, address issuer, uint256 anchoredAt)'],
          provider,
        );
        const contractHash = `0x${String(proofHash).replace(/^0x/, '')}`;
        const onchain = await contract.verifyCredential(contractHash);
        console.log('\n[SEPOLIA_SMOKE] credentialHash=', contractHash);
        console.log('[SEPOLIA_SMOKE] onchainValid=', Boolean(onchain[0]));
        console.log('[SEPOLIA_SMOKE] anchoredAt=', Number(onchain[2]));
      } catch {
        // Non-blocking: receipt status is the hard evidence gate
      }
    }

    console.log('\n[SEPOLIA_SMOKE] txHash=', txHash);
    console.log('[SEPOLIA_SMOKE] txStatus=', Number(receipt!.status));
  }, 180_000);
});
