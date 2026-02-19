import crypto from 'crypto';
import { walletStorageService } from './wallet/storage';
import { walletEncryptionService } from './wallet/encryption';
import { walletSharingService } from './wallet/sharing';
import {
    WalletState,
    StoredCredential,
    ShareRecord,
    ConsentLog,
    ConsentGrantRecord,
    DataRequestRecord,
    CertInIncidentRecord,
    WalletNotification,
    MediaFile,
    AccessLog
} from './wallet/types';

// Re-export types for backward compatibility
export * from './wallet/types';

/**
 * Wallet Service - Complete credential wallet management
 * Handles credential storage, encryption, sharing, and synchronization
 */
export class WalletService {

    /**
     * Initialize or get wallet for user
     */
    async getOrCreateWallet(userId: number, did?: string): Promise<WalletState> {
        return walletStorageService.getOrCreateWallet(userId, did);
    }

    /**
     * Store a new credential with encryption
     */
    async storeCredential(
        userId: number,
        credential: {
            type: string[];
            issuer: string;
            issuanceDate: Date;
            expirationDate?: Date;
            data: any;
            jwt?: string;
            category?: string;
        }
    ): Promise<StoredCredential> {
        const wallet = await this.getOrCreateWallet(userId);

        // Encrypt sensitive data
        const encryptedData = walletEncryptionService.encrypt(JSON.stringify(credential.data));
        const hash = walletEncryptionService.hashCredential(credential.data);

        const storedCredential: StoredCredential = {
            id: `cred-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            type: credential.type,
            issuer: credential.issuer,
            issuanceDate: credential.issuanceDate,
            expirationDate: credential.expirationDate,
            data: credential.data, // Keep decrypted for display
            jwt: credential.jwt,
            encryptedData,
            hash,
            anchorStatus: 'pending',
            category: (credential.category as any) || 'other',
            verificationCount: 0,
        };

        wallet.credentials.push(storedCredential);

        // Add notification
        await this.addNotification(userId, {
            type: 'credential_received',
            title: 'New Credential Received',
            message: `${credential.issuer} issued you a new ${credential.type[0] || 'credential'}`,
            data: { credentialId: storedCredential.id },
        });

        // Simulate blockchain anchoring
        setTimeout(() => this.simulateAnchor(userId, storedCredential.id), 2000);
        await walletStorageService.queuePersist();

        return storedCredential;
    }

    /**
     * Create a share link for a credential
     */
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
        return walletSharingService.createShare(userId, credentialId, options);
    }

    /**
     * Verify access to a shared credential
     */
    async accessShare(
        shareId: string,
        accessInfo: { ip: string; userAgent: string; location?: string; organization?: string }
    ): Promise<{ valid: boolean; credential?: Partial<StoredCredential>; error?: string }> {
        return walletSharingService.accessShare(shareId, accessInfo);
    }

    /**
     * Revoke a share
     */
    async revokeShare(userId: number, shareId: string): Promise<boolean> {
        return walletSharingService.revokeShare(userId, shareId);
    }

    /**
     * Get all credentials for a user
     */
    async getCredentials(userId: number): Promise<StoredCredential[]> {
        const wallet = await this.getOrCreateWallet(userId);
        return wallet.credentials;
    }

    /**
     * Get credentials by category
     */
    async getCredentialsByCategory(userId: number, category: string): Promise<StoredCredential[]> {
        const wallet = await this.getOrCreateWallet(userId);
        return wallet.credentials.filter(c => c.category === category);
    }

    /**
     * Get share history for a credential
     */
    async getShareHistory(userId: number, credentialId?: string): Promise<ShareRecord[]> {
        const wallet = await this.getOrCreateWallet(userId);
        if (credentialId) {
            return wallet.shares.filter(s => s.credentialId === credentialId);
        }
        return wallet.shares;
    }

    /**
     * Get consent logs
     */
    async getConsentLogs(userId: number, credentialId?: string): Promise<ConsentLog[]> {
        const wallet = await this.getOrCreateWallet(userId);
        if (credentialId) {
            return wallet.consentLogs.filter(c => c.credentialId === credentialId);
        }
        return wallet.consentLogs;
    }

    async createConsentGrant(
        userId: number,
        input: {
            verifierId: string;
            purpose: string;
            dataElements: string[];
            expiry: string;
            consentProof?: Record<string, unknown>;
        },
    ): Promise<ConsentGrantRecord> {
        const wallet = await this.getOrCreateWallet(userId);
        const grant: ConsentGrantRecord = {
            id: `consent-grant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            subject_id: wallet.did || `user:${userId}`,
            verifier_id: input.verifierId,
            purpose: input.purpose,
            data_elements: input.dataElements,
            expiry: input.expiry,
            revocation_ts: null,
            consent_proof: input.consentProof || {
                issued_by: 'credity-wallet',
                issued_at: new Date().toISOString(),
            },
            created_at: new Date().toISOString(),
        };

        wallet.consentGrants.unshift(grant);
        await walletStorageService.queuePersist();
        return grant;
    }

    async listConsentGrants(userId: number): Promise<ConsentGrantRecord[]> {
        const wallet = await this.getOrCreateWallet(userId);
        return wallet.consentGrants;
    }

    async revokeConsentGrant(userId: number, consentGrantId: string): Promise<ConsentGrantRecord | null> {
        const wallet = await this.getOrCreateWallet(userId);
        const consent = wallet.consentGrants.find((item) => item.id === consentGrantId);
        if (!consent) {
            return null;
        }

        if (!consent.revocation_ts) {
            consent.revocation_ts = new Date().toISOString();
            await walletStorageService.queuePersist();
        }
        return consent;
    }

    async submitDataRequest(
        userId: number,
        input: {
            type: 'export' | 'delete';
            reason?: string;
        },
    ): Promise<DataRequestRecord> {
        const wallet = await this.getOrCreateWallet(userId);
        const record: DataRequestRecord = {
            id: `data-req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            user_id: userId,
            request_type: input.type,
            status: 'accepted',
            created_at: new Date().toISOString(),
            completed_at: null,
            reason: input.reason,
        };

        wallet.dataRequests.unshift(record);

        record.status = 'processing';
        if (input.type === 'export') {
            const result = await this.buildExportPayload(userId);
            record.result = result;
            record.status = 'completed';
            record.completed_at = new Date().toISOString();
        } else {
            // Delete request scaffold: records intent and marks workflow complete for now.
            record.result = {
                deleted_credential_count: wallet.credentials.length,
                deleted_share_count: wallet.shares.length,
                deleted_consent_log_count: wallet.consentLogs.length,
                deleted_consent_grant_count: wallet.consentGrants.length,
            };
            wallet.credentials = [];
            wallet.shares = [];
            wallet.consentLogs = [];
            wallet.consentGrants = [];
            record.status = 'completed';
            record.completed_at = new Date().toISOString();
        }
        await walletStorageService.queuePersist();

        return record;
    }

    async listDataRequests(userId: number): Promise<DataRequestRecord[]> {
        const wallet = await this.getOrCreateWallet(userId);
        return wallet.dataRequests;
    }

    async createCertInIncident(input: {
        category: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        detectedAt?: string;
        metadata?: Record<string, unknown>;
    }): Promise<CertInIncidentRecord> {
        await walletStorageService.ensureHydrated();
        const detectedAt = input.detectedAt || new Date().toISOString();
        const detectedDate = new Date(detectedAt);
        const reportDueAt = new Date(detectedDate.getTime() + 6 * 60 * 60 * 1000).toISOString();
        const now = new Date().toISOString();

        const incident: CertInIncidentRecord = {
            id: `incident-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            category: input.category,
            severity: input.severity,
            detected_at: detectedAt,
            report_due_at: reportDueAt,
            status: 'open',
            metadata: input.metadata || {},
            log_retention_days: 180,
            created_at: now,
            updated_at: now,
        };

        await walletStorageService.createCertInIncident(incident);
        return incident;
    }

    async listCertInIncidents(): Promise<Array<CertInIncidentRecord & { seconds_to_report_due: number }>> {
        const incidents = await walletStorageService.listCertInIncidents();
        const now = Date.now();
        return incidents.map((incident) => ({
            ...incident,
            seconds_to_report_due: Math.max(0, Math.floor((new Date(incident.report_due_at).getTime() - now) / 1000)),
        }));
    }

    /**
     * Get notifications
     */
    async getNotifications(userId: number): Promise<WalletNotification[]> {
        const wallet = await this.getOrCreateWallet(userId);
        return wallet.notifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }

    /**
     * Mark notification as read
     */
    async markNotificationRead(userId: number, notificationId: string): Promise<void> {
        const wallet = await this.getOrCreateWallet(userId);
        const notification = wallet.notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
            await walletStorageService.queuePersist();
        }
    }

    /**
     * Create wallet backup
     */
    async createBackup(userId: number): Promise<{ backupData: string; backupKey: string }> {
        const wallet = await this.getOrCreateWallet(userId);
        const backupKey = crypto.randomBytes(32).toString('hex');

        const backupData = walletEncryptionService.encrypt(JSON.stringify({
            userId: wallet.userId,
            did: wallet.did,
            credentials: wallet.credentials.map(c => ({
                ...c,
                data: undefined, // Use encrypted data only
            })),
            exportedAt: new Date().toISOString(),
        }), backupKey);

        wallet.backupKey = walletEncryptionService.hashCredential(backupKey); // Store hash only
        await walletStorageService.queuePersist();

        return { backupData, backupKey };
    }

    /**
     * Restore from backup
     */
    async restoreFromBackup(backupData: string, backupKey: string): Promise<WalletState> {
        const decrypted = walletEncryptionService.decrypt(backupData, backupKey);
        const data = JSON.parse(decrypted);

        const wallet = await this.getOrCreateWallet(data.userId, data.did);
        // Merge credentials (avoid duplicates by hash)
        for (const cred of data.credentials) {
            if (!wallet.credentials.some(c => c.hash === cred.hash)) {
                wallet.credentials.push(cred);
            }
        }
        await walletStorageService.queuePersist();

        return wallet;
    }

    /**
     * Get wallet statistics
     */
    async getWalletStats(userId: number): Promise<{
        totalCredentials: number;
        byCategory: Record<string, number>;
        totalShares: number;
        activeShares: number;
        totalVerifications: number;
        lastActivity: Date;
    }> {
        const wallet = await this.getOrCreateWallet(userId);

        const byCategory: Record<string, number> = {};
        for (const cred of wallet.credentials) {
            byCategory[cred.category] = (byCategory[cred.category] || 0) + 1;
        }

        const activeShares = wallet.shares.filter(s => !s.revoked && new Date() < s.expiry).length;
        const totalVerifications = wallet.shares.reduce((sum, s) => sum + s.accessLog.length, 0);

        return {
            totalCredentials: wallet.credentials.length,
            byCategory,
            totalShares: wallet.shares.length,
            activeShares,
            totalVerifications,
            lastActivity: wallet.lastSync,
        };
    }

    // ============== Private Helpers ==============

    private async addNotification(userId: number, notification: Omit<WalletNotification, 'id' | 'timestamp' | 'read'>) {
        const wallet = await walletStorageService.getOrCreateWallet(userId);
        if (wallet) {
            wallet.notifications.push({
                ...notification,
                id: `notif-${Date.now()}`,
                timestamp: new Date(),
                read: false,
            });
        }
    }

    private async buildExportPayload(userId: number): Promise<Record<string, unknown>> {
        const wallet = await this.getOrCreateWallet(userId);
        return {
            exported_at: new Date().toISOString(),
            user_id: userId,
            did: wallet.did,
            credentials: wallet.credentials.map((credential) => ({
                id: credential.id,
                type: credential.type,
                issuer: credential.issuer,
                issuanceDate: credential.issuanceDate.toISOString(),
                expirationDate: credential.expirationDate?.toISOString() || null,
                anchorStatus: credential.anchorStatus,
            })),
            shares: wallet.shares.map((share) => ({
                id: share.id,
                credentialId: share.credentialId,
                shareType: share.shareType,
                expiry: share.expiry.toISOString(),
                revoked: share.revoked,
            })),
            consent_logs: wallet.consentLogs.map((log) => ({
                id: log.id,
                credentialId: log.credentialId,
                action: log.action,
                purpose: log.purpose,
                timestamp: log.timestamp.toISOString(),
            })),
            consent_grants: wallet.consentGrants,
        };
    }

    private async simulateAnchor(userId: number, credentialId: string) {
        // Ensure hydrated before accessing (though usually it's already hydrated if simulateAnchor is called after storeCredential)
        await walletStorageService.ensureHydrated();
        const wallet = await walletStorageService.getOrCreateWallet(userId);
        if (wallet) {
            const credential = wallet.credentials.find(c => c.id === credentialId);
            if (credential) {
                credential.anchorStatus = 'anchored';
                credential.anchorTxHash = `0x${crypto.randomBytes(32).toString('hex')}`;
                credential.blockNumber = Math.floor(Math.random() * 1000000) + 50000000;

                await this.addNotification(userId, {
                    type: 'credential_received',
                    title: 'Credential Anchored',
                    message: `Your credential has been anchored to the blockchain`,
                    data: { credentialId, txHash: credential.anchorTxHash },
                });
                await walletStorageService.queuePersist();
            }
        }
    }
}

export const walletService = new WalletService();

export function resetWalletServiceStoreForTests(): void {
    walletStorageService.reset();
}
