import { Router } from 'express';
import { z } from 'zod';
import { walletService } from '../services/wallet-service';
import { qrService } from '../services/qr-service';
import { selectiveDisclosureService } from '../services/selective-disclosure';
import { storage } from '../storage';
import { createProofMetadata, verifyDeterministicProof } from '../utils/proof-lifecycle';
import { verifyAccessToken, type AuthUser } from '../services/auth-service';

const router = Router();

const proofGenerateSchema = z.object({
    credentialId: z.string().min(1).max(256),
});

const proofVerifySchema = z.object({
    credential: z.record(z.unknown()),
    proof: z.object({
        algorithm: z.enum(['sha256']).optional(),
        hash: z.string().regex(/^[a-fA-F0-9]{64}$/),
    }),
});

function requireProofAuth(allowedRoles: AuthUser['role'][]) {
    return (req: any, res: any, next: any) => {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authentication required', code: 'PROOF_AUTH_REQUIRED' });
        }

        const payload = verifyAccessToken(authHeader.substring(7));
        if (!payload) {
            return res.status(401).json({ error: 'Invalid or expired token', code: 'PROOF_AUTH_INVALID' });
        }

        if (!allowedRoles.includes(payload.role as AuthUser['role'])) {
            return res.status(403).json({ error: 'Insufficient permissions', code: 'PROOF_FORBIDDEN' });
        }

        req.user = payload;
        next();
    };
}

// ============== Sharing ==============

router.post('/wallet/proofs/generate', requireProofAuth(['holder', 'admin']), async (req, res) => {
    try {
        const userId = Number.parseInt(String(req.user?.userId || req.body?.userId || '1'), 10) || 1;
        const parsed = proofGenerateSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: 'credentialId is required',
                code: 'PROOF_CREDENTIAL_ID_REQUIRED',
                details: parsed.error.flatten(),
            });
        }
        const { credentialId } = parsed.data;

        const credentials = await walletService.getCredentials(userId);
        const credential = credentials.find((item) => item.id === credentialId);
        if (!credential) {
            return res.status(404).json({
                error: 'Credential not found',
                code: 'PROOF_CREDENTIAL_NOT_FOUND',
            });
        }

        const proof = createProofMetadata(credential.data, 'sha256');
        return res.json({
            success: true,
            credentialId,
            proof,
            metadata: {
                anchorStatus: credential.anchorStatus,
                issuer: credential.issuer,
            },
        });
    } catch (error) {
        console.error('Generate proof error:', error);
        return res.status(500).json({ error: 'Failed to generate proof', code: 'PROOF_GENERATION_FAILED' });
    }
});

router.post('/wallet/proofs/verify', requireProofAuth(['holder', 'verifier', 'issuer', 'admin']), async (req, res) => {
    try {
        const parsed = proofVerifySchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: 'credential and proof.hash are required',
                code: 'PROOF_VERIFY_INPUT_INVALID',
                details: parsed.error.flatten(),
            });
        }

        const { credential: credentialData, proof } = parsed.data;
        const verification = verifyDeterministicProof(credentialData, {
            algorithm: proof.algorithm || 'sha256',
            hash: proof.hash,
        });

        return res.json({
            success: true,
            valid: verification.valid,
            computedHash: verification.computedHash,
            expectedHash: proof.hash,
            code: verification.valid ? 'PROOF_VALID' : 'PROOF_HASH_MISMATCH',
        });
    } catch (error) {
        console.error('Verify proof error:', error);
        return res.status(500).json({ error: 'Failed to verify proof', code: 'PROOF_VERIFY_FAILED' });
    }
});

/**
 * Create a share (QR, link, email, etc.)
 */
router.post('/wallet/share', async (req, res) => {
    try {
        const { userId, credentialId, shareType, disclosedFields, expiryMinutes, recipientInfo, purpose } = req.body;

        if (!userId || !credentialId) {
            return res.status(400).json({ error: 'userId and credentialId required' });
        }

        const share = await walletService.createShare(userId, credentialId, {
            shareType: shareType || 'link',
            disclosedFields: disclosedFields || [],
            expiryMinutes: expiryMinutes || 30,
            recipientInfo,
            purpose,
        });

        const shareUrl = `${process.env.WALLET_BASE_URL || 'http://localhost:5002'}/verify/${share.token}`;

        // Generate QR data if needed
        let qrData;
        if (shareType === 'qr') {
            qrData = JSON.stringify({
                shareId: share.id,
                token: share.token,
                verifyUrl: shareUrl,
                expiry: share.expiry.toISOString(),
            });
        }

        // Log activity
        await storage.createActivity({
            userId,
            type: 'share_created',
            description: `Shared credential via ${shareType || 'link'} (expires in ${expiryMinutes || 30}m)`,
        });

        res.json({
            success: true,
            share,
            shareUrl,
            qrData,
        });
    } catch (error) {
        console.error('Create share error:', error);
        res.status(500).json({ error: 'Failed to create share' });
    }
});

/**
 * Generate QR code for credential sharing (Direct endpoint)
 */
router.post('/credentials/:id/qr', async (req, res) => {
    try {
        const credentialId = parseInt(req.params.id);
        const { expiryMinutes = 5, disclosedFields } = req.body;

        const credential = await storage.getCredential(credentialId);
        if (!credential) {
            return res.status(404).json({ error: 'Credential not found' });
        }

        const qrPayload = qrService.generateQRPayload(
            credentialId.toString(),
            credential.data,
            {
                expiryMinutes: expiryMinutes as 1 | 5 | 30 | 60,
                disclosedFields,
            }
        );

        const qrData = JSON.stringify(qrPayload);
        const qrImageSvg = await qrService.generateQRCodeSVG(qrData, 250);

        // Log activity
        await storage.createActivity({
            userId: credential.userId,
            type: 'qr_generated',
            description: `QR code generated (expires in ${expiryMinutes}m)`,
        });

        res.json({
            success: true,
            qrPayload,
            qrData,
            qrImageSvg,
        });
    } catch (error) {
        console.error('Error generating QR:', error);
        res.status(500).json({ error: 'Failed to generate QR code' });
    }
});

/**
 * Access/verify a shared credential
 */
router.get('/verify/:token', async (req, res) => {
    try {
        const { token } = req.params;

        const result = await walletService.accessShare(token, {
            ip: req.ip || 'unknown',
            userAgent: req.get('user-agent') || 'unknown',
            organization: req.query.org as string,
        });

        if (!result.valid) {
            return res.status(result.error?.includes('expired') ? 410 : 404).json({
                valid: false,
                error: result.error,
            });
        }

        const proof = result.credential?.data
            ? createProofMetadata(result.credential.data, 'sha256')
            : undefined;

        res.json({
            valid: true,
            credential: result.credential,
            proof,
            verification: {
                status: 'verified',
                timestamp: new Date().toISOString(),
                blockchain: result.credential?.anchorStatus === 'anchored',
            },
        });
    } catch (error) {
        console.error('Verify share error:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
});

/**
 * Check old share link (Legacy support)
 */
router.get('/share/verify/:shareId', async (req, res) => {
    try {
        const { shareId } = req.params;

        const result = qrService.validateShareLink(shareId, {
            ip: req.ip,
            userAgent: req.get('user-agent'),
        });

        if (!result.valid) {
            return res.status(result.expired ? 410 : 404).json({
                error: result.error,
                expired: result.expired,
            });
        }

        // Get the credential
        const credentialId = parseInt(result.shareLink!.credentialId);
        const credential = await storage.getCredential(credentialId);

        if (!credential) {
            return res.status(404).json({ error: 'Credential not found' });
        }

        // Apply selective disclosure
        let disclosedData = credential.data;
        if (result.shareLink!.disclosedFields.length > 0) {
            // Only return disclosed fields
            const request = {
                credentialId: credentialId.toString(),
                requestedFields: result.shareLink!.disclosedFields,
                purpose: 'share_link_access',
            };
            const token = selectiveDisclosureService.createDisclosureToken(
                credentialId.toString(),
                credential.data,
                request
            );
            disclosedData = token.disclosedData;
        }

        res.json({
            success: true,
            credential: {
                id: credential.id,
                type: credential.type,
                issuer: credential.issuer,
                issuanceDate: credential.issuanceDate,
                data: disclosedData,
            },
            verification: {
                status: 'verified',
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error('Error verifying share link:', error);
        res.status(500).json({ error: 'Failed to verify share link' });
    }
});

/**
 * Revoke a share
 */
router.post('/wallet/share/:shareId/revoke', async (req, res) => {
    try {
        const { shareId } = req.params;
        const userId = parseInt(req.body.userId) || 1;

        const revoked = await walletService.revokeShare(userId, shareId);

        if (!revoked) {
            return res.status(404).json({ error: 'Share not found' });
        }

        await storage.createActivity({
            userId,
            type: 'share_revoked',
            description: `Revoked share ${shareId}`,
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Revoke share error:', error);
        res.status(500).json({ error: 'Failed to revoke share' });
    }
});

/**
 * Get share history
 */
router.get('/wallet/shares', async (req, res) => {
    try {
        const userId = parseInt(req.query.userId as string) || 1;
        const credentialId = req.query.credentialId as string;

        const shares = await walletService.getShareHistory(userId, credentialId);

        res.json({ shares });
    } catch (error) {
        console.error('Get shares error:', error);
        res.status(500).json({ error: 'Failed to get shares' });
    }
});

// ============== Selective Disclosure ==============

/**
 * Get available fields for selective disclosure
 */
router.get('/wallet/credentials/:id/fields', async (req, res) => {
    try {
        const userId = parseInt(req.query.userId as string) || 1;
        const { id } = req.params;

        const credentials = await walletService.getCredentials(userId);
        const credential = credentials.find(c => c.id === id);

        if (!credential) {
            return res.status(404).json({ error: 'Credential not found' });
        }

        const fields = selectiveDisclosureService.getCredentialFields(credential.data);
        const categories = selectiveDisclosureService.getFieldCategories();

        res.json({ fields, categories });
    } catch (error) {
        console.error('Get fields error:', error);
        res.status(500).json({ error: 'Failed to get fields' });
    }
});

/**
 * Create selective disclosure token
 */
router.post('/credentials/:id/disclose', async (req, res) => {
    try {
        const credentialId = parseInt(req.params.id);
        const { requestedFields, purpose, requesterDID, expiryMinutes = 30 } = req.body;

        const credential = await storage.getCredential(credentialId);
        if (!credential) {
            return res.status(404).json({ error: 'Credential not found' });
        }

        if (!requestedFields || !Array.isArray(requestedFields)) {
            return res.status(400).json({ error: 'requestedFields array is required' });
        }

        const token = selectiveDisclosureService.createDisclosureToken(
            credentialId.toString(),
            credential.data,
            {
                credentialId: credentialId.toString(),
                requestedFields,
                requesterDID,
                purpose: purpose || 'general',
                expiryMinutes,
            }
        );

        // Log consent
        selectiveDisclosureService.logConsent(
            credentialId.toString(),
            requestedFields,
            true,
            {
                requesterDID,
                purpose: purpose || 'general',
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
            }
        );

        // Log activity
        await storage.createActivity({
            userId: credential.userId,
            type: 'disclosure_created',
            description: `Disclosed ${requestedFields.length} fields for ${purpose || 'verification'}`,
        });

        res.json({
            success: true,
            token,
        });
    } catch (error) {
        console.error('Error creating disclosure:', error);
        res.status(500).json({ error: 'Failed to create disclosure' });
    }
});

/**
 * Get consent logs
 */
router.get('/wallet/consent-logs', async (req, res) => {
    try {
        const userId = parseInt(req.query.userId as string) || 1;
        const credentialId = req.query.credentialId as string;

        const logs = await walletService.getConsentLogs(userId, credentialId);

        res.json({ logs });
    } catch (error) {
        console.error('Get consent logs error:', error);
        res.status(500).json({ error: 'Failed to get consent logs' });
    }
});

export default router;
