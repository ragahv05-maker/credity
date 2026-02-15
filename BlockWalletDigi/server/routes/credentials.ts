import { Router } from 'express';
import { z } from 'zod';
import { walletService } from '../services/wallet-service';
import { storage } from '../storage';
import { authMiddleware } from '../services/auth-service';
import { sanitizeUnsafeMetadata } from '../utils/metadata-sanitizer';

const router = Router();

const offerClaimSchema = z.object({
    url: z.string().url().max(2048),
});

const proofPayloadSchema = z.object({
    algorithm: z.enum(['sha256']).optional().nullable(),
    hashAlgorithm: z.string().optional().nullable(),
    hash: z.string().regex(/^[a-fA-F0-9]{64}$/).optional().nullable(),
    credentialHash: z.string().regex(/^[a-fA-F0-9]{64}$/).optional().nullable(),
}).passthrough().transform((value) => ({
    ...value,
    algorithm: value.algorithm || (value.hashAlgorithm === 'sha256' ? 'sha256' : undefined),
    hash: value.hash || value.credentialHash || undefined,
}));

function getAuthenticatedUserId(req: any): number {
    return Number(req.user?.userId);
}

// ============== Credential Management ==============

/**
 * List all credentials
 */
router.get('/wallet/credentials', authMiddleware, async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);
        const category = req.query.category as string;

        let credentials;
        if (category) {
            credentials = await walletService.getCredentialsByCategory(userId, category);
        } else {
            credentials = await walletService.getCredentials(userId);
        }

        res.json({ credentials });
    } catch (error) {
        console.error('Get credentials error:', error);
        res.status(500).json({ error: 'Failed to get credentials' });
    }
});

/**
 * Get single credential details
 */
router.get('/wallet/credentials/:id', authMiddleware, async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);
        const { id } = req.params;

        const credentials = await walletService.getCredentials(userId);
        const credential = credentials.find(c => c.id === id);

        if (!credential) {
            return res.status(404).json({ error: 'Credential not found' });
        }

        // Get share history for this credential
        const shares = await walletService.getShareHistory(userId, id);
        const consentLogs = await walletService.getConsentLogs(userId, id);

        res.json({
            credential,
            shares,
            consentLogs,
            verificationCount: credential.verificationCount,
        });
    } catch (error) {
        console.error('Get credential error:', error);
        res.status(500).json({ error: 'Failed to get credential' });
    }
});

/**
 * Store a new credential
 */
router.post('/wallet/credentials', authMiddleware, async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);
        const { credential } = req.body;
        if (!credential) {
            return res.status(400).json({ error: 'credential required' });
        }

        const stored = await walletService.storeCredential(userId, {
            type: credential.type || ['VerifiableCredential'],
            issuer: credential.issuer || 'Unknown',
            issuanceDate: new Date(credential.issuanceDate || Date.now()),
            expirationDate: credential.expirationDate ? new Date(credential.expirationDate) : undefined,
            data: credential.data || credential,
            jwt: credential.jwt,
            category: credential.category,
        });

        // Also store in legacy storage for dashboard compatibility
        try {
            await storage.createCredential({
                userId,
                type: stored.type,
                issuer: stored.issuer,
                issuanceDate: stored.issuanceDate,
                data: stored.data,
                jwt: stored.jwt,
            });
        } catch (e) {
            // Ignore duplication error if any
        }

        // Log activity
        await storage.createActivity({
            userId,
            type: 'credential_stored',
            description: `Stored ${stored.type[0]} from ${stored.issuer}`,
        });

        res.json({ success: true, credential: stored });
    } catch (error) {
        console.error('Store credential error:', error);
        res.status(500).json({ error: 'Failed to store credential' });
    }
});

/**
 * Import a credential (VC-JWT)
 */
router.post('/credentials/import', authMiddleware, async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);
        const { jwt: vcJwt, type, issuer, data } = req.body;

        // In production, we would decode and validate the VC-JWT
        // For MVP, we accept the credential data directly
        const credential = await storage.createCredential({
            userId,
            type: type || ['VerifiableCredential'],
            issuer: issuer || 'Unknown Issuer',
            issuanceDate: new Date(),
            data: data || {},
            jwt: vcJwt,
        });

        // Log activity
        await storage.createActivity({
            userId,
            type: 'credential_imported',
            description: `Imported credential from ${issuer || 'Unknown Issuer'}`,
        });

        res.json({
            success: true,
            credential,
            message: 'Credential imported successfully',
        });
    } catch (error) {
        console.error('Error importing credential:', error);
        res.status(500).json({ error: 'Failed to import credential' });
    }
});
// ... import endpoint ...

/**
 * Claim a credential from an Offer URL
 */
router.post('/wallet/offer/claim', authMiddleware, async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);
        const parsedRequest = offerClaimSchema.safeParse(req.body);
        if (!parsedRequest.success) {
            return res.status(400).json({ error: 'url required', code: 'OFFER_CLAIM_INVALID_URL', details: parsedRequest.error.flatten() });
        }
        const { url } = parsedRequest.data;

        console.log(`[Wallet] Claiming offer from: ${url}`);

        // Fetch credential from Issuer
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch offer: ${response.status}`);
        }

        const data = await response.json();
        // Expected format: { credential: { tenantId, templateId, issuerId, recipient, credentialData, vcJwt, ... }, vcJwt: string }

        if (!data.credential && !data.vcJwt) {
            throw new Error("Invalid response format from Issuer");
        }

        const credData = data.credential || {};
        const vcJwt = data.vcJwt || credData.vcJwt;
        const parsedProof = proofPayloadSchema.safeParse(data?.proof);
        const proofMeta = parsedProof.success ? sanitizeUnsafeMetadata(parsedProof.data) : null;

        function decodeJwtPayload(jwt: string): any | null {
            try {
                const parts = jwt.split('.');
                if (parts.length !== 3) return null;
                const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
                return JSON.parse(payloadJson);
            } catch {
                return null;
            }
        }

        const decodedPayload = typeof vcJwt === 'string' && vcJwt.length > 0 ? decodeJwtPayload(vcJwt) : null;

        // Extract issuer info - try to get issuer name from storage or use ID
        let issuerName = 'External Issuer';
        if (credData.issuerId) {
            try {
                const issuerRes = await fetch(`http://localhost:5001/api/v1/public/registry/issuers/${credData.issuerId}`);
                if (issuerRes.ok) {
                    const issuerData = await issuerRes.json();
                    issuerName = issuerData.name || issuerName;
                }
            } catch (e) {
                console.log('[Wallet] Could not fetch issuer info');
            }
        }

        // Determine credential type from template or data
        const credType = credData.credentialData?.credentialName || decodedPayload?.vc?.type?.[1] || 'Verified Credential';

        // Store in wallet
        // For demo determinism, prefer storing the decoded VC-JWT payload (so selective disclosure works on the VC shape)
        // while also preserving the original JWT for recruiter verification.
        const stored = await walletService.storeCredential(userId, {
            type: ['VerifiableCredential', credType],
            issuer: issuerName,
            issuanceDate: credData.createdAt ? new Date(credData.createdAt) : new Date(),
            data: sanitizeUnsafeMetadata({
                ...(decodedPayload || credData),
                proof: proofMeta || (decodedPayload as any)?.proof || (credData as any)?.proof,
              }),
            jwt: vcJwt,
            category: 'academic' // Default category
        });

        // Log activity
        await storage.createActivity({
            userId,
            type: 'credential_imported',
            description: `Claimed ${credType} from ${issuerName}`,
        });

        res.json({
            success: true,
            credential: stored,
            proof: proofMeta,
            code: 'OFFER_CLAIMED',
            message: 'Credential claimed successfully'
        });

    } catch (error: any) {
        console.error('[Wallet] Claim offer error:', error);
        res.status(500).json({ error: 'Failed to claim offer', code: 'OFFER_CLAIM_FAILED' });
    }
});

export default router;
