import crypto from 'crypto';

/**
 * Credential Push Service
 * 
 * Enables issuers to push credentials directly to wallets.
 * Uses a simple notification/inbox system with polling or webhooks.
 */

interface PendingCredential {
    id: string;
    issuerId: string;
    issuerName: string;
    recipientDid: string;
    recipientEmail?: string;
    credentialPreview: {
        type: string[];
        issuer: string;
        name: string;
        description?: string;
        issuedAt: string;
    };
    fullCredential: any; // Encrypted or full VC
    status: 'pending' | 'accepted' | 'rejected' | 'expired';
    createdAt: Date;
    expiresAt: Date;
    acceptedAt?: Date;
}

interface WebhookConfig {
    url: string;
    secret: string;
    events: string[];
}

// In-memory storage (use Redis/DB in production)
const pendingCredentials = new Map<string, PendingCredential>();
const credentialsByRecipient = new Map<string, Set<string>>();
const webhookConfigs = new Map<string, WebhookConfig>(); // walletDid -> config

/**
 * Generate unique credential offer ID
 */
function generateOfferId(): string {
    return `offer_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * Push a credential to a wallet
 */
export async function pushCredentialToWallet(
    issuerId: string,
    issuerName: string,
    recipientDid: string,
    credentialData: any,
    options?: {
        recipientEmail?: string;
        expiryHours?: number;
        sendWebhook?: boolean;
    }
): Promise<{ offerId: string; status: string }> {
    const offerId = generateOfferId();
    const expiryHours = options?.expiryHours || 72;

    const pendingCred: PendingCredential = {
        id: offerId,
        issuerId,
        issuerName,
        recipientDid,
        recipientEmail: options?.recipientEmail,
        credentialPreview: {
            type: credentialData.type || ['VerifiableCredential'],
            issuer: issuerName,
            name: credentialData.data?.name || credentialData.type?.[1] || 'Credential',
            description: credentialData.data?.description,
            issuedAt: new Date().toISOString(),
        },
        fullCredential: credentialData,
        status: 'pending',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + expiryHours * 60 * 60 * 1000),
    };

    pendingCredentials.set(offerId, pendingCred);

    // Index by recipient
    if (!credentialsByRecipient.has(recipientDid)) {
        credentialsByRecipient.set(recipientDid, new Set());
    }
    credentialsByRecipient.get(recipientDid)!.add(offerId);

    // Send webhook if configured
    if (options?.sendWebhook !== false) {
        await sendWebhookNotification(recipientDid, 'credential_offered', {
            offerId,
            preview: pendingCred.credentialPreview,
        });
    }

    console.log(`[Push] Credential ${offerId} pushed to ${recipientDid}`);

    return { offerId, status: 'pending' };
}

/**
 * Get pending credentials for a wallet
 */
export function getPendingCredentials(walletDid: string): PendingCredential[] {
    const offerIds = credentialsByRecipient.get(walletDid);
    if (!offerIds) return [];

    const now = new Date();
    const pending: PendingCredential[] = [];

    offerIds.forEach((id) => {
        const cred = pendingCredentials.get(id);
        if (cred && cred.status === 'pending') {
            if (cred.expiresAt > now) {
                pending.push(cred);
            } else {
                cred.status = 'expired';
            }
        }
    });

    return pending;
}

/**
 * Accept a credential offer
 */
export function acceptCredentialOffer(offerId: string, walletDid: string): {
    success: boolean;
    credential?: any;
    error?: string;
} {
    const offer = pendingCredentials.get(offerId);

    if (!offer) {
        return { success: false, error: 'Offer not found' };
    }

    if (offer.recipientDid !== walletDid) {
        return { success: false, error: 'Not authorized' };
    }

    if (offer.status !== 'pending') {
        return { success: false, error: `Offer already ${offer.status}` };
    }

    if (offer.expiresAt < new Date()) {
        offer.status = 'expired';
        return { success: false, error: 'Offer expired' };
    }

    offer.status = 'accepted';
    offer.acceptedAt = new Date();

    console.log(`[Push] Offer ${offerId} accepted by ${walletDid}`);

    return {
        success: true,
        credential: offer.fullCredential,
    };
}

/**
 * Reject a credential offer
 */
export function rejectCredentialOffer(offerId: string, walletDid: string): boolean {
    const offer = pendingCredentials.get(offerId);

    if (!offer || offer.recipientDid !== walletDid) {
        return false;
    }

    if (offer.status === 'pending') {
        offer.status = 'rejected';
        console.log(`[Push] Offer ${offerId} rejected by ${walletDid}`);
        return true;
    }

    return false;
}

/**
 * Get offer details
 */
export function getCredentialOffer(offerId: string): PendingCredential | null {
    return pendingCredentials.get(offerId) || null;
}

/**
 * Register webhook for wallet notifications
 */
export function registerWebhook(
    walletDid: string,
    url: string,
    events: string[] = ['credential_offered', 'credential_revoked']
): string {
    const secret = crypto.randomBytes(32).toString('hex');

    webhookConfigs.set(walletDid, {
        url,
        secret,
        events,
    });

    console.log(`[Push] Webhook registered for ${walletDid}`);

    return secret;
}

/**
 * Send webhook notification
 */
async function sendWebhookNotification(
    walletDid: string,
    event: string,
    payload: any
): Promise<void> {
    const config = webhookConfigs.get(walletDid);
    if (!config || !config.events.includes(event)) {
        return;
    }

    const body = JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        payload,
    });

    const signature = crypto
        .createHmac('sha256', config.secret)
        .update(body)
        .digest('hex');

    try {
        await fetch(config.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CredVerse-Signature': signature,
                'X-CredVerse-Event': event,
            },
            body,
        });
        console.log(`[Push] Webhook sent to ${config.url} for event ${event}`);
    } catch (error) {
        console.error(`[Push] Webhook failed:`, error);
    }
}

/**
 * Clean up expired offers
 */
export function cleanupExpiredOffers(): number {
    const now = new Date();
    let cleaned = 0;

    pendingCredentials.forEach((offer, id) => {
        if (offer.status === 'pending' && offer.expiresAt < now) {
            offer.status = 'expired';
            cleaned++;
        }
    });

    return cleaned;
}

// Run cleanup every hour
setInterval(() => {
    const cleaned = cleanupExpiredOffers();
    if (cleaned > 0) {
        console.log(`[Push] Cleaned up ${cleaned} expired offers`);
    }
}, 60 * 60 * 1000);
