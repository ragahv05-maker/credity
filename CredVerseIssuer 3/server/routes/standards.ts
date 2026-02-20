import { Router } from 'express';
import crypto from 'crypto';
import { apiKeyOrAuthMiddleware } from '../auth';
import { issuanceService, RevocationError } from '../services/issuance';
import { storage } from '../storage';
import { idempotencyMiddleware, PostgresStateStore } from '@credverse/shared-auth';
import type {
    ProofGenerationRequestContract,
    ProofGenerationResultContract,
    RevocationWitnessContract,
} from '@credverse/shared-auth';
import {
    registerCredentialStatus,
    revokeCredentialStatus,
    getCredentialStatus,
    getStatusList,
} from '../services/status-list-service';
import {
    createAnchorBatch,
    anchorBatch,
    getAnchorBatch,
    getAnchorDeadLetters,
    getAnchorProof,
    replayAnchorBatch,
    AnchorBatchError,
} from '../services/anchor-batch-service';
import { deterministicHash } from '../services/proof-lifecycle';
import { generateProof, ProofGenerationError } from '../services/proof-service';

type CredentialOfferState = {
    tenantId: string;
    templateId: string;
    issuerId: string;
    recipient: Record<string, unknown>;
    credentialData: Record<string, unknown>;
    format: 'sd-jwt-vc' | 'vc+jwt';
    expiresAt: number;
};

type AccessTokenState = { offer: CredentialOfferState; expiresAt: number };
type Oid4vciRuntimeState = {
    preAuthCodes: Array<[string, CredentialOfferState]>;
    accessTokens: Array<[string, AccessTokenState]>;
};

const preAuthCodes = new Map<string, CredentialOfferState>();
const accessTokens = new Map<string, AccessTokenState>();
const hasDatabase = typeof process.env.DATABASE_URL === 'string' && process.env.DATABASE_URL.length > 0;
const stateStore = hasDatabase
    ? new PostgresStateStore<Oid4vciRuntimeState>({
        databaseUrl: process.env.DATABASE_URL as string,
        serviceKey: 'issuer-oid4vci-runtime',
    })
    : null;

let hydrated = false;
let hydrationPromise: Promise<void> | null = null;
let persistChain = Promise.resolve();

const router = Router();
const writeIdempotency = idempotencyMiddleware({ ttlMs: 6 * 60 * 60 * 1000 });

function hasIssuerAccess(req: any): boolean {
    if (typeof req.headers?.['x-api-key'] === 'string') {
        return true;
    }
    const role = String(req.user?.role || '').toLowerCase();
    return role === 'issuer' || role === 'admin';
}

function enforceProofRouteAccess(req: any, res: any, next: any): void {
    if (!hasIssuerAccess(req)) {
        res.status(403).json({ message: 'Forbidden', code: 'PROOF_FORBIDDEN' });
        return;
    }
    next();
}

function enforceIssuerWriteAccess(req: any, res: any): boolean {
    if (hasIssuerAccess(req)) {
        return true;
    }
    res.status(403).json({ message: 'Forbidden', code: 'ISSUER_FORBIDDEN' });
    return false;
}

function buildBaseUrl(req: any): string {
    return `${req.protocol}://${req.get('host')}`;
}

function issueRandomId(prefix: string): string {
    return `${prefix}_${crypto.randomBytes(16).toString('hex')}`;
}

function parseBearer(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    return authHeader.slice(7);
}

async function ensureHydrated(): Promise<void> {
    if (!stateStore || hydrated) return;
    if (!hydrationPromise) {
        hydrationPromise = (async () => {
            const loaded = await stateStore.load();
            if (loaded) {
                preAuthCodes.clear();
                accessTokens.clear();
                for (const [code, offer] of loaded.preAuthCodes || []) {
                    preAuthCodes.set(code, offer);
                }
                for (const [token, tokenState] of loaded.accessTokens || []) {
                    accessTokens.set(token, tokenState);
                }
            } else {
                await stateStore.save({
                    preAuthCodes: [],
                    accessTokens: [],
                });
            }
            hydrated = true;
        })();
    }
    await hydrationPromise;
}

async function queuePersist(): Promise<void> {
    if (!stateStore) return;
    persistChain = persistChain
        .then(async () => {
            await stateStore.save({
                preAuthCodes: Array.from(preAuthCodes.entries()),
                accessTokens: Array.from(accessTokens.entries()),
            });
        })
        .catch((error) => {
            console.error('[OID4VCI] Persist failed:', error);
        });
    await persistChain;
}

function pruneExpiredOidSessionState(): boolean {
    let changed = false;
    const now = Date.now();
    for (const [code, offer] of preAuthCodes.entries()) {
        if (offer.expiresAt < now) {
            preAuthCodes.delete(code);
            changed = true;
        }
    }
    for (const [token, state] of accessTokens.entries()) {
        if (state.expiresAt < now) {
            accessTokens.delete(token);
            changed = true;
        }
    }
    return changed;
}

router.get('/.well-known/openid-credential-issuer', (req, res) => {
    const baseUrl = buildBaseUrl(req);
    res.json({
        credential_issuer: `${baseUrl}/api/v1/oid4vci`,
        authorization_servers: [`${baseUrl}/api/v1/oid4vci`],
        credential_endpoint: `${baseUrl}/api/v1/oid4vci/credential`,
        token_endpoint: `${baseUrl}/api/v1/oid4vci/token`,
        deferred_credential_endpoint: `${baseUrl}/api/v1/oid4vci/deferred`,
        credential_configurations_supported: {
            'credity_identity_v1': {
                format: 'vc+jwt',
                cryptographic_binding_methods_supported: ['did:key', 'did:web'],
                proof_types_supported: { jwt: { proof_signing_alg_values_supported: ['ES256', 'EdDSA'] } },
            },
            'credity_identity_sdjwt_v1': {
                format: 'sd-jwt-vc',
                cryptographic_binding_methods_supported: ['did:key', 'did:web'],
                proof_types_supported: { jwt: { proof_signing_alg_values_supported: ['ES256', 'EdDSA'] } },
            },
        },
    });
});

router.post('/api/v1/oid4vci/credential-offers', apiKeyOrAuthMiddleware, writeIdempotency, async (req, res) => {
    try {
        if (!enforceIssuerWriteAccess(req as any, res)) {
            return;
        }
        await ensureHydrated();
        const pruned = pruneExpiredOidSessionState();
        if (pruned) {
            await queuePersist();
        }
        const tenantId = (req as any).tenantId;
        const { templateId, issuerId, recipient, credentialData, format = 'sd-jwt-vc' } = req.body || {};
        if (!templateId || !issuerId || !recipient || !credentialData) {
            return res.status(400).json({ error: 'templateId, issuerId, recipient and credentialData are required' });
        }

        const preAuthorizedCode = issueRandomId('preauth');
        preAuthCodes.set(preAuthorizedCode, {
            tenantId,
            templateId,
            issuerId,
            recipient,
            credentialData,
            format: format === 'vc+jwt' ? 'vc+jwt' : 'sd-jwt-vc',
            expiresAt: Date.now() + 10 * 60 * 1000,
        });
        await queuePersist();

        const baseUrl = buildBaseUrl(req);
        res.status(201).json({
            credential_offer: {
                credential_issuer: `${baseUrl}/api/v1/oid4vci`,
                credential_configuration_ids: ['credity_identity_v1'],
                grants: {
                    'urn:ietf:params:oauth:grant-type:pre-authorized_code': {
                        'pre-authorized_code': preAuthorizedCode,
                        user_pin_required: false,
                    },
                },
            },
            expires_in: 600,
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to create credential offer' });
    }
});

router.post('/api/v1/oid4vci/token', async (req, res) => {
    try {
        await ensureHydrated();
        const pruned = pruneExpiredOidSessionState();
        if (pruned) {
            await queuePersist();
        }

        const { grant_type: grantType, 'pre-authorized_code': preAuthorizedCode } = req.body || {};
        if (grantType !== 'urn:ietf:params:oauth:grant-type:pre-authorized_code') {
            return res.status(400).json({ error: 'unsupported_grant_type' });
        }
        if (!preAuthorizedCode) {
            return res.status(400).json({ error: 'pre-authorized_code is required' });
        }

        const offer = preAuthCodes.get(preAuthorizedCode);
        if (!offer || offer.expiresAt < Date.now()) {
            return res.status(401).json({ error: 'invalid_grant' });
        }
        preAuthCodes.delete(preAuthorizedCode);

        const accessToken = issueRandomId('at');
        accessTokens.set(accessToken, { offer, expiresAt: Date.now() + 10 * 60 * 1000 });
        await queuePersist();

        res.json({
            access_token: accessToken,
            token_type: 'Bearer',
            expires_in: 600,
            c_nonce: issueRandomId('nonce'),
            c_nonce_expires_in: 600,
        });
    } catch (error: any) {
        res.status(500).json({ error: error?.message || 'token_endpoint_failure' });
    }
});

router.post('/api/v1/oid4vci/credential', writeIdempotency, async (req, res) => {
    try {
        await ensureHydrated();
        const pruned = pruneExpiredOidSessionState();
        if (pruned) {
            await queuePersist();
        }
        const token = parseBearer(req.header('Authorization'));
        if (!token) {
            return res.status(401).json({ error: 'invalid_token' });
        }
        const tokenState = accessTokens.get(token);
        if (!tokenState || tokenState.expiresAt < Date.now()) {
            return res.status(401).json({ error: 'invalid_token' });
        }
        const offer = tokenState.offer;
        if (!offer || offer.expiresAt < Date.now()) {
            return res.status(401).json({ error: 'invalid_grant' });
        }
        accessTokens.delete(token);
        await queuePersist();

        const credential = await issuanceService.issueCredential(
            offer.tenantId,
            offer.templateId,
            offer.issuerId,
            offer.recipient,
            offer.credentialData
        );

        const status = await registerCredentialStatus(credential.id);
        res.json({
            format: offer.format,
            credential: credential.vcJwt,
            c_nonce: issueRandomId('nonce'),
            c_nonce_expires_in: 600,
            credential_id: credential.id,
            status: {
                status_list_id: status.listId,
                status_list_index: status.index,
            },
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Credential issuance failed' });
    }
});

router.post('/api/v1/oid4vci/deferred', async (req, res) => {
    const { acceptance_token: acceptanceToken } = req.body || {};
    const configuredRetryAfter = Number(process.env.OID4VCI_DEFERRED_RETRY_AFTER_SECONDS || 5);
    const retryAfter = Number.isFinite(configuredRetryAfter) && configuredRetryAfter > 0
        ? Math.floor(configuredRetryAfter)
        : 5;

    res.status(202).json({
        acceptance_token: acceptanceToken || null,
        status: 'pending',
        retry_after: retryAfter,
    });
});

router.get('/api/v1/status/bitstring/:listId', async (req, res) => {
    try {
        const list = await getStatusList(req.params.listId);
        res.json({
            id: list.id,
            type: 'BitstringStatusList',
            bitstring: list.bitstring,
            size: list.size,
            revoked_count: list.revokedCount,
            digest: list.digest,
            updated_at: list.updatedAt,
        });
    } catch (error: any) {
        res.status(500).json({ message: error?.message || 'Failed to resolve status list' });
    }
});

router.post('/api/v1/credentials/:id/revoke', apiKeyOrAuthMiddleware, writeIdempotency, async (req, res) => {
    try {
        if (!enforceIssuerWriteAccess(req as any, res)) {
            return;
        }
        const credentialId = req.params.id;
        const credential = await storage.getCredential(credentialId);
        if (!credential) {
            return res.status(404).json({ message: 'Credential not found' });
        }
        const tenantId = (req as any).tenantId;
        if (credential.tenantId !== tenantId) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const reason = req.body?.reason || 'revoked_by_issuer';
        const revocation = await issuanceService.revokeCredential(credentialId, reason);
        const status = revocation.alreadyRevoked ? await getCredentialStatus(credentialId) : await revokeCredentialStatus(credentialId);

        res.json({
            success: true,
            credential_id: credentialId,
            status: status ? { list_id: status.listId, index: status.index, revoked: status.revoked } : null,
            code: revocation.alreadyRevoked ? 'CREDENTIAL_ALREADY_REVOKED' : 'CREDENTIAL_REVOKED',
        });
    } catch (error: any) {
        if (error instanceof RevocationError) {
            return res.status(error.status).json({ message: error.message, code: error.code });
        }
        res.status(500).json({ message: error.message || 'Failed to revoke credential' });
    }
});

router.post('/api/v1/anchors/batches', apiKeyOrAuthMiddleware, writeIdempotency, async (req, res) => {
    try {
        if (!enforceIssuerWriteAccess(req as any, res)) {
            return;
        }
        const { credentialIds } = req.body || {};
        if (!Array.isArray(credentialIds) || credentialIds.length === 0) {
            return res.status(400).json({ message: 'credentialIds is required' });
        }

        const records = await Promise.all(
            credentialIds.map((id: string) => storage.getCredential(id))
        );
        const validRecords = records.filter(Boolean) as any[];
        if (validRecords.length !== credentialIds.length) {
            return res.status(400).json({ message: 'One or more credentials do not exist' });
        }
        const tenantId = (req as any).tenantId;
        const hasForeignTenantRecord = validRecords.some((record) => record.tenantId !== tenantId);
        if (hasForeignTenantRecord) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const hashInputs = validRecords.map((record) => {
            const knownHash = record.credentialHash || record.txHash;
            if (knownHash) return String(knownHash);

            if (record.vcJwt) {
                return crypto.createHash('sha256').update(String(record.vcJwt)).digest('hex');
            }

            return deterministicHash(record.credentialData, 'sha256', 'RFC8785-V1');
        });

        const batch = await createAnchorBatch(credentialIds, hashInputs);
        void anchorBatch(batch.batchId);
        res.status(202).json({
            batch_id: batch.batchId,
            status: batch.status,
            merkle_root: batch.merkleRoot,
        });
    } catch (error: any) {
        if (error instanceof AnchorBatchError) {
            return res.status(error.status).json({
                message: error.message,
                code: error.code,
                batch_id: error.batchId,
            });
        }
        res.status(500).json({ message: error.message || 'Failed to create anchor batch' });
    }
});

router.get('/api/v1/anchors/batches/:batchId', async (req, res) => {
    try {
        const batch = await getAnchorBatch(req.params.batchId);
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found' });
        }
        res.json(batch);
    } catch (error: any) {
        res.status(500).json({ message: error?.message || 'Failed to load anchor batch' });
    }
});

router.post('/api/v1/anchors/batches/:batchId/replay', apiKeyOrAuthMiddleware, writeIdempotency, async (req, res) => {
    try {
        if (!enforceIssuerWriteAccess(req as any, res)) {
            return;
        }
        const replayed = await replayAnchorBatch(req.params.batchId);
        res.status(202).json({
            batch_id: replayed.batchId,
            status: replayed.status,
            tx_hash: replayed.txHash,
            attempt_count: replayed.attemptCount,
        });
    } catch (error: any) {
        if (error instanceof AnchorBatchError) {
            return res.status(error.status).json({
                message: error.message,
                code: error.code,
                batch_id: error.batchId,
            });
        }
        const message = error?.message || 'Failed to replay anchor batch';
        const status = message.toLowerCase().includes('not found') ? 404 : 500;
        res.status(status).json({ message });
    }
});

router.get('/api/v1/anchors/dead-letter', apiKeyOrAuthMiddleware, async (req, res) => {
    try {
        if (!enforceIssuerWriteAccess(req as any, res)) {
            return;
        }
        const limit = Number(req.query.limit || 50);
        const entries = await getAnchorDeadLetters(limit);
        res.json({
            count: entries.length,
            entries,
        });
    } catch (error: any) {
        res.status(500).json({ message: error?.message || 'Failed to load dead-letter entries' });
    }
});

router.get('/api/v1/anchors/proofs/:credentialId', async (req, res) => {
    try {
        const proof = await getAnchorProof(req.params.credentialId);
        if (!proof) {
            return res.status(404).json({ message: 'Proof not found' });
        }
        res.json(proof);
    } catch (error: any) {
        res.status(500).json({ message: error?.message || 'Failed to load anchor proof' });
    }
});

router.get('/api/v1/credentials/:id/status', async (req, res) => {
    const credential = await storage.getCredential(req.params.id);
    if (!credential) {
        return res.status(404).json({ message: 'Credential not found' });
    }
    const status = await getCredentialStatus(req.params.id);
    res.json({
        credential_id: req.params.id,
        revoked: credential.revoked,
        status_list: status,
    });
});

const supportedProofFormats = new Set<ProofGenerationResultContract['format']>([
    'sd-jwt-vc',
    'jwt_vp',
    'ldp_vp',
    'ldp_vc',
    'merkle-membership',
]);

function parseProofFormat(format: unknown): ProofGenerationResultContract['format'] | null {
    if (typeof format !== 'string') return null;
    return supportedProofFormats.has(format as ProofGenerationResultContract['format'])
        ? (format as ProofGenerationResultContract['format'])
        : null;
}

router.post('/api/v1/proofs/generate', apiKeyOrAuthMiddleware, enforceProofRouteAccess, writeIdempotency, async (req, res) => {
    try {
        const payload = (req.body || {}) as Partial<ProofGenerationRequestContract>;
        const format = parseProofFormat(payload.format);
        const credentialId = typeof payload.credential_id === 'string' ? payload.credential_id : null;

        if (!format) {
            return res.status(400).json({
                message: 'Unsupported proof format',
                code: 'PROOF_FORMAT_INVALID',
                allowed_formats: Array.from(supportedProofFormats),
            });
        }

        if (!credentialId && !payload.subject_did) {
            return res.status(400).json({ message: 'credential_id or subject_did is required', code: 'PROOF_INPUT_INVALID' });
        }

        let credential: any = null;
        if (credentialId) {
            credential = await storage.getCredential(credentialId);
            if (!credential) {
                return res.status(404).json({ message: 'Credential not found', code: 'PROOF_CREDENTIAL_NOT_FOUND' });
            }
            const tenantId = (req as any).tenantId;
            if (credential.tenantId !== tenantId) {
                return res.status(403).json({ message: 'Forbidden', code: 'PROOF_FORBIDDEN' });
            }
        }

        const result: ProofGenerationResultContract = generateProof({
            request: {
                ...(payload as ProofGenerationRequestContract),
                format,
                credential_id: credentialId || undefined,
            },
            credential,
            issuerBaseUrl: `${req.protocol}://${req.get('host')}`,
        });

        if (result.status !== 'generated') {
            return res.status(501).json({
                ...result,
                code: 'PROOF_INTEGRATION_REQUIRED',
                integration_required: true,
            });
        }

        return res.status(201).json({ ...result, code: 'PROOF_GENERATED' });
    } catch (error: any) {
        if (error instanceof ProofGenerationError) {
            return res.status(error.status).json({ message: error.message, code: error.code });
        }
        return res.status(500).json({ message: error?.message || 'Failed to generate proof', code: 'PROOF_GENERATE_INTERNAL_ERROR' });
    }
});

router.get('/api/v1/proofs/revocation-witness/:credentialId', apiKeyOrAuthMiddleware, enforceProofRouteAccess, async (req, res) => {
    const credentialId = req.params.credentialId;
    const credential = await storage.getCredential(credentialId);
    if (!credential) {
        return res.status(404).json({ message: 'Credential not found' });
    }

    const status = await getCredentialStatus(credentialId);
    const anchor = await getAnchorProof(credentialId);

    const witness: RevocationWitnessContract = {
        credential_id: credentialId,
        revoked: Boolean(credential.revoked || status?.revoked),
        status_list: status
            ? {
                list_id: status.listId,
                index: status.index,
                revoked: status.revoked,
                updated_at: status.updatedAt,
            }
            : null,
        anchor_proof: anchor
            ? {
                batch_id: anchor.batchId,
                root: anchor.root,
                proof: anchor.proof,
            }
            : null,
    };

    res.json(witness);
});

export default router;
