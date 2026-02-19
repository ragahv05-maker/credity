import { walletStorageService, WalletStorageService } from './storage';
import { walletEncryptionService, WalletEncryptionService } from './encryption';
import { ShareRecord, StoredCredential, WalletNotification } from './types';

export class WalletSharingService {
    private storage: WalletStorageService;
    private encryption: WalletEncryptionService;

    constructor(storage: WalletStorageService, encryption: WalletEncryptionService) {
        this.storage = storage;
        this.encryption = encryption;
    }

    async createShare(
        userId: number,
        credentialId: string,
        options: {
            shareType: 'qr' | 'link' | 'email' | 'whatsapp' | 'ats' | 'recruiter';
            disclosedFields: string[];
            expiryMinutes: number;
            recipientInfo?: string;
            purpose?: string;
        }
    ): Promise<ShareRecord> {
        const wallet = await this.storage.getOrCreateWallet(userId);
        const credential = wallet.credentials.find(c => c.id === credentialId);

        if (!credential) {
            throw new Error('Credential not found');
        }

        const token = this.encryption.generateShareToken();
        const expiry = new Date(Date.now() + options.expiryMinutes * 60 * 1000);

        const share: ShareRecord = {
            id: `share-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            credentialId,
            shareType: options.shareType,
            recipientInfo: options.recipientInfo,
            disclosedFields: options.disclosedFields,
            token,
            expiry,
            createdAt: new Date(),
            accessLog: [],
            revoked: false,
        };

        wallet.shares.push(share);

        // Log consent
        wallet.consentLogs.push({
            id: `consent-${Date.now()}`,
            credentialId,
            action: 'share',
            disclosedFields: options.disclosedFields,
            recipientName: options.recipientInfo,
            purpose: options.purpose || 'general',
            timestamp: new Date(),
        });
        await this.storage.queuePersist();

        return share;
    }

    async accessShare(
        shareId: string,
        accessInfo: { ip: string; userAgent: string; location?: string; organization?: string }
    ): Promise<{ valid: boolean; credential?: Partial<StoredCredential>; error?: string }> {
        const wallets = await this.storage.getAllWallets();
        // Find share across all wallets
        for (const [userId, wallet] of Array.from(wallets.entries())) {
            const share = wallet.shares.find((s: ShareRecord) => s.id === shareId || s.token === shareId);

            if (share) {
                if (share.revoked) {
                    return { valid: false, error: 'Share has been revoked' };
                }

                if (new Date() > share.expiry) {
                    return { valid: false, error: 'Share has expired' };
                }

                // Log access
                share.accessLog.push({
                    timestamp: new Date(),
                    ip: accessInfo.ip,
                    userAgent: accessInfo.userAgent,
                    location: accessInfo.location,
                    organization: accessInfo.organization,
                    verified: true,
                });

                // Get credential with selective disclosure
                const credential = wallet.credentials.find((c: StoredCredential) => c.id === share.credentialId);
                if (!credential) {
                    return { valid: false, error: 'Credential not found' };
                }

                // Apply selective disclosure
                const disclosedData = this.encryption.applySelectiveDisclosure(credential.data, share.disclosedFields);

                // Notify wallet owner
                this.addNotification(userId, {
                    type: 'share_access',
                    title: 'Credential Accessed',
                    message: `Your ${credential.type[0]} was verified${accessInfo.organization ? ` by ${accessInfo.organization}` : ''}`,
                    data: { shareId, accessInfo },
                });
                await this.storage.queuePersist();

                return {
                    valid: true,
                    credential: {
                        id: credential.id,
                        type: credential.type,
                        issuer: credential.issuer,
                        issuanceDate: credential.issuanceDate,
                        data: disclosedData,
                        anchorStatus: credential.anchorStatus,
                        hash: credential.hash,
                    },
                };
            }
        }

        return { valid: false, error: 'Share not found' };
    }

    async revokeShare(userId: number, shareId: string): Promise<boolean> {
        const wallet = await this.storage.getOrCreateWallet(userId);
        const share = wallet.shares.find(s => s.id === shareId);

        if (share) {
            share.revoked = true;

            wallet.consentLogs.push({
                id: `consent-${Date.now()}`,
                credentialId: share.credentialId,
                action: 'revoke',
                disclosedFields: share.disclosedFields,
                purpose: 'share_revoked',
                timestamp: new Date(),
            });
            await this.storage.queuePersist();

            return true;
        }

        return false;
    }

    // Helper to add notification (since it needs access to wallet state)
    // In a real microservices architecture, this would probably be an event emission.
    private async addNotification(userId: number, notification: Omit<WalletNotification, 'id' | 'timestamp' | 'read'>) {
        const wallet = await this.storage.getOrCreateWallet(userId);
        if (wallet) {
            wallet.notifications.push({
                ...notification,
                id: `notif-${Date.now()}`,
                timestamp: new Date(),
                read: false,
            });
            // Note: queuePersist is called by the caller of this method (accessShare) usually,
            // but here we might need to ensure it's saved if called independently.
            // accessShare calls queuePersist after this returns, so it's fine.
        }
    }
}

export const walletSharingService = new WalletSharingService(walletStorageService, walletEncryptionService);
