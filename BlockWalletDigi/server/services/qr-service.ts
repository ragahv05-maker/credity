import { generateAccessToken, validateAccessToken, sha256 } from './crypto-utils';
import QRCode from 'qrcode';

/**
 * QR Code Service for CredVerse Wallet
 * Generates time-limited QR codes for credential sharing
 */

export interface QRPayload {
    credentialId: string;
    credentialHash: string;
    accessToken: string;
    verifyEndpoint: string;
    expiry: Date;
    disclosedFields?: string[];
}

export interface QRGenerationOptions {
    expiryMinutes: 1 | 5 | 30 | 60;
    disclosedFields?: string[];
    verifyEndpoint?: string;
}

export interface ShareLink {
    id: string;
    credentialId: string;
    token: string;
    expiry: Date;
    disclosedFields: string[];
    createdAt: Date;
    accessLog: AccessLogEntry[];
}

export interface AccessLogEntry {
    timestamp: Date;
    ip: string;
    userAgent: string;
    location?: string;
    organization?: string;
}

// In-memory storage for share links (production would use database)
const shareLinks = new Map<string, ShareLink>();

/**
 * QR Code Service
 */
export class QRService {
    private baseUrl: string;

    constructor() {
        this.baseUrl = process.env.WALLET_BASE_URL || 'http://localhost:5002';
    }

    /**
     * Generate QR payload for a credential
     */
    generateQRPayload(
        credentialId: string,
        credentialData: any,
        options: QRGenerationOptions
    ): QRPayload {
        const credentialHash = sha256(JSON.stringify(credentialData));

        const { token, expiry } = generateAccessToken(
            {
                credentialId,
                credentialHash,
                disclosedFields: options.disclosedFields || [],
            },
            options.expiryMinutes
        );

        return {
            credentialId,
            credentialHash,
            accessToken: token,
            verifyEndpoint: options.verifyEndpoint || `${this.baseUrl}/api/share/verify`,
            expiry,
            disclosedFields: options.disclosedFields,
        };
    }

    /**
     * Generate a shareable link for a credential
     */
    createShareLink(
        credentialId: string,
        credentialData: any,
        options: QRGenerationOptions
    ): ShareLink {
        const { token, expiry } = generateAccessToken(
            {
                credentialId,
                credentialHash: sha256(JSON.stringify(credentialData)),
                disclosedFields: options.disclosedFields || [],
            },
            options.expiryMinutes
        );

        const shareId = `share-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        const shareLink: ShareLink = {
            id: shareId,
            credentialId,
            token,
            expiry,
            disclosedFields: options.disclosedFields || [],
            createdAt: new Date(),
            accessLog: [],
        };

        shareLinks.set(shareId, shareLink);
        return shareLink;
    }

    /**
     * Validate and get share link data
     */
    validateShareLink(shareId: string, accessInfo?: Partial<AccessLogEntry>): {
        valid: boolean;
        expired?: boolean;
        shareLink?: ShareLink;
        error?: string;
    } {
        const shareLink = shareLinks.get(shareId);

        if (!shareLink) {
            return { valid: false, error: 'Share link not found' };
        }

        if (new Date() > shareLink.expiry) {
            return { valid: false, expired: true, error: 'Share link expired' };
        }

        // Log access
        if (accessInfo) {
            shareLink.accessLog.push({
                timestamp: new Date(),
                ip: accessInfo.ip || 'unknown',
                userAgent: accessInfo.userAgent || 'unknown',
                location: accessInfo.location,
                organization: accessInfo.organization,
            });
        }

        return { valid: true, shareLink };
    }

    /**
     * Get access log for a share link
     */
    getAccessLog(shareId: string): AccessLogEntry[] {
        const shareLink = shareLinks.get(shareId);
        return shareLink?.accessLog || [];
    }

    /**
     * Revoke a share link
     */
    revokeShareLink(shareId: string): boolean {
        return shareLinks.delete(shareId);
    }

    /**
     * Get all active share links for a credential
     */
    getActiveShareLinks(credentialId: string): ShareLink[] {
        const now = new Date();
        return Array.from(shareLinks.values())
            .filter(link => link.credentialId === credentialId && link.expiry > now);
    }

    /**
     * Generate QR code SVG string
     */
    async generateQRCodeSVG(data: string, size: number = 200): Promise<string> {
        return QRCode.toString(data, {
            type: 'svg',
            width: size,
            errorCorrectionLevel: 'M',
        });
    }
}

export const qrService = new QRService();
