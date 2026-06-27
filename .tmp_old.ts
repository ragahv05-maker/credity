import { Router } from "express";
import crypto from 'crypto';
import { storage } from "../storage";
import { digilockerService } from "../services/digilocker-service";
import { walletService } from "../services/wallet-service";
import { authMiddleware } from '../services/auth-service';
import { getAuthenticatedUserId } from '../utils/authz';
import {
    exchangeUserPullCode,
    getStoredUserPullTokens,
    getUserPullAuthUrl,
    listUserDocuments as listUserPullDocuments,
    pullDocument as pullUserPullDocument,
} from '../services/digilocker-pull-service';

const router = Router();
const allowDemoRoutes =
    process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEMO_ROUTES === 'true';

/**
 * User-pull: Redirect authenticated user to DigiLocker OAuth.
 */
router.get('/connections/digilocker/auth', authMiddleware, async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req, res);
        if (!userId) return;

        const nonce = crypto.randomBytes(16).toString('hex');
        const authUrl = await getUserPullAuthUrl(String(userId), nonce);
        res.redirect(authUrl);
    } catch (error: any) {
        console.error('[DigiLocker User Pull] Auth redirect error:', error);
        res.status(500).json({ error: error.message || 'Failed to initiate DigiLocker user-pull auth' });
    }
});

/**
 * User-pull callback: exchange code, persist tokens, then redirect to frontend.
 */
router.get('/connections/digilocker/callback', async (req, res) => {
    const frontendBaseUrl = (process.env.BLOCKWALLET_URL || 'http://localhost:5000').replace(/\/+$/, '');
    const frontendPath = `${frontendBaseUrl}/connections`;

    try {
        const { code, state, error } = req.query;

        if (error) {
            return res.redirect(`${frontendPath}?digilocker=error&reason=${encodeURIComponent(String(error))}`);
        }

        if (!code || !state) {
            return res.redirect(`${frontendPath}?digilocker=error&reason=missing_params`);
        }

        await exchangeUserPullCode(String(code), String(state));
        res.redirect(`${frontendPath}?digilocker=connected`);
    } catch (error: any) {
        console.error('[DigiLocker User Pull] Callback error:', error);
        res.redirect(`${frontendPath}?digilocker=error&reason=${encodeURIComponent(error.message || 'callback_failed')}`);
    }
});

/**
 * User-pull: list documents available in the connected DigiLocker account.
 */
router.get('/connections/digilocker/documents', authMiddleware, async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req, res);
        if (!userId) return;

        const tokens = await getStoredUserPullTokens(userId);
        if (!tokens?.accessToken) {
            return res.status(401).json({ error: 'Not connected to DigiLocker' });
        }

        const documents = await listUserPullDocuments(tokens.accessToken);
        res.json({ success: true, documents });
    } catch (error: any) {
        console.error('[DigiLocker User Pull] List documents error:', error);
        res.status(500).json({ error: error.message || 'Failed to list DigiLocker documents' });
    }
});

/**
 * User-pull: import selected DigiLocker document into wallet credentials.
 */
router.post('/connections/digilocker/import', authMiddleware, async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req, res);
        if (!userId) return;

        const { documentUri, documentType } = req.body || {};
        if (!documentUri || !documentType) {
            return res.status(400).json({ error: 'documentUri and documentType are required' });
        }

        const tokens = await getStoredUserPullTokens(userId);
        if (!tokens?.accessToken) {
            return res.status(401).json({ error: 'Not connected to DigiLocker' });
        }

        const pulled = await pullUserPullDocument(tokens.accessToken, String(documentUri));
        const credential = await storage.createCredential({
            userId,
            type: ['VerifiableCredential', String(documentType), 'DigiLockerDocument'],
            issuer: 'DigiLocker',
            issuanceDate: new Date(),
            data: {
                source: 'DigiLocker',
                documentUri: String(documentUri),
                documentType: String(documentType),
                mimeType: pulled.mimeType,
                base64: pulled.base64,
            },
            jwt: null,
        });

        await storage.createActivity({
            userId,
            type: 'credential_imported',
            description: `Imported ${String(documentType)} from DigiLocker`,
        });

        res.json({ success: true, credentialId: credential.id });
    } catch (error: any) {
        console.error('[DigiLocker User Pull] Import error:', error);
        res.status(500).json({ error: error.message || 'Failed to import DigiLocker document' });
    }
});

/**
 * Get authorization URL for DigiLocker OAuth flow
 */
router.get("/digilocker/auth", authMiddleware, async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req, res);
        if (!userId) return;

        const { url, state } = digilockerService.getAuthorizationUrl(userId);

        res.json({
            authUrl: url,
            state,
            isDemoMode: digilockerService.isDemoMode(),
        });
    } catch (error: any) {
        console.error('[DigiLocker] Auth URL error:', error);
        if (String(error?.message || '').includes('not configured')) {
            return res.status(503).json({ error: 'DigiLocker is not configured for this environment', code: 'DIGILOCKER_UNAVAILABLE' });
        }
        res.status(500).json({ error: error.message, code: 'DIGILOCKER_AUTH_URL_FAILED' });
    }
});

/**
 * OAuth callback - exchange code for tokens
 */
router.get("/digilocker/callback", async (req, res) => {
    try {
        const { code, state, error } = req.query;

        if (error) {
            // Redirect to frontend with error
            return res.redirect(`/connect-digilocker?error=${encodeURIComponent(error as string)}`);
        }

        if (!code || !state) {
            return res.redirect('/connect-digilocker?error=missing_params');
        }

        // Exchange code for tokens
        const tokens = await digilockerService.exchangeCodeForTokens(
            code as string,
            state as string
        );

        // Redirect to frontend with success
        res.redirect(`/connect-digilocker?connected=true&digilocker_id=${tokens.digilocker_id || ''}`);
    } catch (error: any) {
        console.error('[DigiLocker] Callback error:', error);
        res.redirect(`/connect-digilocker?error=${encodeURIComponent(error.message)}`);
    }
});

/**
 * Check connection status
 */
router.get("/digilocker/status", authMiddleware, async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req, res);
        if (!userId) return;

        const isConnected = digilockerService.isConnected(userId);

        if (isConnected) {
            const userInfo = await digilockerService.getUserInfo(userId);
            res.json({
                connected: true,
                user: userInfo,
                isDemoMode: digilockerService.isDemoMode(),
            });
        } else {
            res.json({ connected: false });
        }
    } catch (error: any) {
        res.json({ connected: false, error: error.message, code: 'DIGILOCKER_STATUS_FAILED' });
    }
});

/**
 * List available documents from DigiLocker
 */
router.get("/digilocker/documents", authMiddleware, async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req, res);
        if (!userId) return;

        if (!digilockerService.isConnected(userId)) {
            return res.status(401).json({ error: 'Not connected to DigiLocker', code: 'DIGILOCKER_NOT_CONNECTED' });
        }

        const documents = await digilockerService.listDocuments(userId);

        res.json({ documents });
    } catch (error: any) {
        console.error('[DigiLocker] List documents error:', error);
        res.status(500).json({ error: error.message, code: 'DIGILOCKER_LIST_FAILED' });
    }
});

/**
 * Import a specific document from DigiLocker to wallet
 */
router.post("/digilocker/import", authMiddleware, async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req, res);
        if (!userId) return;

        const { documentUri, documentType, documentName, issuer } = req.body;

        if (!digilockerService.isConnected(userId)) {
            return res.status(401).json({ error: 'Not connected to DigiLocker', code: 'DIGILOCKER_NOT_CONNECTED' });
        }

        // Pull document data from DigiLocker
        const { document } = await digilockerService.pullDocument(userId, documentUri);

        // Determine category based on document type
        const categoryMap: Record<string, string> = {
            'ADHAR': 'government',
            'PAN': 'government',
            'DRVLC': 'government',
            'CLASS10': 'academic',
            'CLASS12': 'academic',
            'DEGREE': 'academic',
        };

        // Store in wallet as verified credential
        const credential = await walletService.storeCredential(userId, {
            type: ['VerifiableCredential', documentType, 'DigiLockerDocument'],
            issuer: issuer || 'DigiLocker',
            issuanceDate: new Date(),
            data: {
                name: documentName,
                source: 'DigiLocker',
                uri: documentUri,
                ...document,
            },
            category: categoryMap[documentType] || 'government',
        });

        // Log activity
        await storage.createActivity({
            userId,
            type: "import",
            description: `Imported ${documentName} from DigiLocker`,
        });

        res.json({
            success: true,
            credential,
            message: `${documentName} imported successfully`,
        });
    } catch (error: any) {
        console.error('[DigiLocker] Import error:', error);
        res.status(500).json({ error: error.message, code: 'DIGILOCKER_IMPORT_FAILED' });
    }
});

/**
 * Import all available documents from DigiLocker
 */
router.post("/digilocker/import-all", authMiddleware, async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req, res);
        if (!userId) return;

        if (!digilockerService.isConnected(userId)) {
            return res.status(401).json({ error: 'Not connected to DigiLocker', code: 'DIGILOCKER_NOT_CONNECTED' });
        }

        const documents = await digilockerService.listDocuments(userId);
        const imported: string[] = [];
        const failed: string[] = [];

        const credentialsToStore: any[] = [];
        const successDocs: string[] = [];

        for (const doc of documents) {
            try {
                const { document } = await digilockerService.pullDocument(userId, doc.uri);

                credentialsToStore.push({
                    type: ['VerifiableCredential', doc.doctype, 'DigiLockerDocument'],
                    issuer: doc.issuer,
                    issuanceDate: new Date(doc.date),
                    data: {
                        name: doc.name,
                        description: doc.description,
                        source: 'DigiLocker',
                        uri: doc.uri,
                        issuerid: doc.issuerid,
                        ...document,
                    },
                    category: doc.doctype.includes('CLASS') ? 'academic' : 'government',
                });
                successDocs.push(doc.name);
            } catch (e) {
                failed.push(doc.name);
            }
        }

        if (credentialsToStore.length > 0) {
            for (const credential of credentialsToStore) {
                await walletService.storeCredential(userId, credential);
            }
            imported.push(...successDocs);
        }

        await storage.createActivity({
            userId,
            type: "bulk_import",
            description: `Imported ${imported.length} documents from DigiLocker`,
        });

        res.json({
            success: true,
            imported,
            failed,
            total: documents.length,
        });
    } catch (error: any) {
        console.error('[DigiLocker] Import all error:', error);
        res.status(500).json({ error: error.message, code: 'DIGILOCKER_IMPORT_ALL_FAILED' });
    }
});

/**
 * Disconnect from DigiLocker
 */
router.post("/digilocker/disconnect", authMiddleware, async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req, res);
        if (!userId) return;

        digilockerService.disconnect(userId);

        await storage.createActivity({
            userId,
            type: "disconnect",
            description: "Disconnected DigiLocker account",
        });

        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message, code: 'DIGILOCKER_DISCONNECT_FAILED' });
    }
});

/**
 * Demo mode: Quick connect without OAuth (for testing)
 */
router.post("/digilocker/connect", authMiddleware, async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req, res);
        if (!userId) return;

        // Simulate OAuth flow for demo
        const { url, state } = digilockerService.getAuthorizationUrl(userId);

        // In demo mode, auto-complete the flow
        if (digilockerService.isDemoMode()) {
            if (!allowDemoRoutes) {
                return res.status(404).json({ error: 'Not found', code: 'DEMO_ROUTES_DISABLED' });
            }

            await digilockerService.exchangeCodeForTokens('demo_code', state);

            // Import demo documents
            const documents = await digilockerService.listDocuments(userId);

            const credentialsToStore: any[] = [];

            for (const doc of documents.slice(0, 3)) { // Import first 3
                try {
                    const { document } = await digilockerService.pullDocument(userId, doc.uri);

                    credentialsToStore.push({
                        type: ['VerifiableCredential', doc.doctype, 'DigiLockerDocument'],
                        issuer: doc.issuer,
                        issuanceDate: new Date(doc.date),
                        data: {
                            name: doc.name,
                            source: 'DigiLocker',
                            uri: doc.uri,
                            ...document,
                        },
                        category: doc.doctype.includes('CLASS') ? 'academic' : 'government',
                    });
                } catch (e) {
                    console.error('[DigiLocker] Demo import error:', e);
                }
            }

            if (credentialsToStore.length > 0) {
                for (const credential of credentialsToStore) {
                    await walletService.storeCredential(userId, credential);
                }
            }

            await storage.createActivity({
                userId,
                type: "connect",
                description: "Connected DigiLocker account",
            });

            res.json({
                success: true,
                isDemoMode: true,
                documentsImported: 3,
                message: "DigiLocker connected (Demo Mode)",
            });
        } else {
            // Return auth URL for real mode
            res.json({
                success: false,
                requiresAuth: true,
                authUrl: url,
                state,
            });
        }
    } catch (error: any) {
        console.error('[DigiLocker] Connect error:', error);
        if (String(error?.message || '').includes('not configured')) {
            return res.status(503).json({ error: 'DigiLocker is not configured for this environment', code: 'DIGILOCKER_UNAVAILABLE' });
        }
        res.status(500).json({ error: error.message, code: 'DIGILOCKER_CONNECT_FAILED' });
    }
});

export default router;
