import crypto from 'crypto';
import { PostgresStateStore } from '@credverse/shared-auth';

/**
 * Wallet Service - Complete credential wallet management
 * Handles credential storage, encryption, sharing, and synchronization
 */

export interface WalletState {
    userId: number;
    did: string;
    credentials: StoredCredential[];
    shares: ShareRecord[];
    consentLogs: ConsentLog[];
    consentGrants: ConsentGrantRecord[];
    dataRequests: DataRequestRecord[];
    notifications: WalletNotification[];
    backupKey?: string;
    lastSync: Date;
}

export interface StoredCredential {
    id: string;
    type: string[];
    issuer: string;
    issuanceDate: Date;
    expirationDate?: Date;
    data: any;
    jwt?: string;
    encryptedData: string;
    hash: string;
    anchorStatus: 'pending' | 'anchored' | 'revoked';
    anchorTxHash?: string;
    blockNumber?: number;
    category: 'academic' | 'employment' | 'government' | 'medical' | 'kyc' | 'skill' | 'other';
    mediaFiles?: MediaFile[];
    lastVerified?: Date;
    verificationCount: number;
}

export interface MediaFile {
    id: string;
    name: string;
    type: string;
    ipfsHash?: string;
    encryptedUrl: string;
    size: number;
}

export interface ShareRecord {
    id: string;
    credentialId: string;
    shareType: 'qr' | 'link' | 'email' | 'whatsapp' | 'ats' | 'recruiter';
    recipientInfo?: string;
    disclosedFields: string[];
    token: string;
    expiry: Date;
    createdAt: Date;
    accessLog: AccessLog[];
    revoked: boolean;
}

export interface AccessLog {
    timestamp: Date;
    ip: string;
    userAgent: string;
    location?: string;
    organization?: string;
    verified: boolean;
}

export interface ConsentLog {
    id: string;
    credentialId: string;
    action: 'share' | 'verify' | 'revoke';
    disclosedFields: string[];
    recipientDid?: string;
    recipientName?: string;
    purpose: string;
    timestamp: Date;
    ipAddress?: string;
}

export interface ConsentGrantRecord {
    id: string;
    subject_id: string;
    verifier_id: string;
    purpose: string;
    data_elements: string[];
    expiry: string;
    revocation_ts: string | null;
    consent_proof: Record<string, unknown>;
    created_at: string;
}

export interface DataRequestRecord {
    id: string;
    user_id: number;
    request_type: 'export' | 'delete';
    status: 'accepted' | 'processing' | 'completed';
    created_at: string;
    completed_at: string | null;
    reason?: string;
    result?: Record<string, unknown>;
}

export interface CertInIncidentRecord {
    id: string;
    category: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    detected_at: string;
    report_due_at: string;
    status: 'open' | 'reported' | 'closed';
    report_reference?: string;
    metadata: Record<string, unknown>;
    log_retention_days: number;
    created_at: string;
    updated_at: string;
}

export interface WalletNotification {
    id: string;
    type: 'verification' | 'share_access' | 'credential_received' | 'credential_revoked' | 'sync' | 'security';
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
    data?: any;
}

type PersistedStoredCredential = Omit<StoredCredential, 'issuanceDate' | 'expirationDate' | 'lastVerified'> & {
    issuanceDate: string;
    expirationDate?: string;
    lastVerified?: string;
};

type PersistedShareRecord = Omit<ShareRecord, 'expiry' | 'createdAt' | 'accessLog'> & {
    expiry: string;
    createdAt: string;
    accessLog: Array<Omit<AccessLog, 'timestamp'> & { timestamp: string }>;
};

type PersistedConsentLog = Omit<ConsentLog, 'timestamp'> & { timestamp: string };
type PersistedNotification = Omit<WalletNotification, 'timestamp'> & { timestamp: string };

type PersistedWalletState = Omit<WalletState, 'lastSync' | 'credentials' | 'shares' | 'consentLogs' | 'notifications'> & {
    lastSync: string;
    credentials: PersistedStoredCredential[];
    shares: PersistedShareRecord[];
    consentLogs: PersistedConsentLog[];
    notifications: PersistedNotification[];
};

type WalletServiceState = {
    wallets: Array<[number, PersistedWalletState]>;
    certInIncidents: Array<[string, CertInIncidentRecord]>;
};

const wallets = new Map<number, WalletState>();
const certInIncidents = new Map<string, CertInIncidentRecord>();
const hasDatabase = typeof process.env.DATABASE_URL === 'string' && process.env.DATABASE_URL.length > 0;
const stateStore = hasDatabase
    ? new PostgresStateStore<WalletServiceState>({
        databaseUrl: process.env.DATABASE_URL as string,
        serviceKey: 'wallet-runtime-state',
    })
    : null;

let hydrated = false;
let hydrationPromise: Promise<void> | null = null;
let persistChain = Promise.resolve();

function serializeWalletState(wallet: WalletState): PersistedWalletState {
    return {
        ...wallet,
        lastSync: wallet.lastSync.toISOString(),
        credentials: wallet.credentials.map((credential) => ({
            ...credential,
            issuanceDate: credential.issuanceDate.toISOString(),
            expirationDate: credential.expirationDate?.toISOString(),
            lastVerified: credential.lastVerified?.toISOString(),
        })),
        shares: wallet.shares.map((share) => ({
            ...share,
            expiry: share.expiry.toISOString(),
            createdAt: share.createdAt.toISOString(),
            accessLog: share.accessLog.map((entry) => ({
                ...entry,
                timestamp: entry.timestamp.toISOString(),
            })),
        })),
        consentLogs: wallet.consentLogs.map((entry) => ({
            ...entry,
            timestamp: entry.timestamp.toISOString(),
        })),
        notifications: wallet.notifications.map((entry) => ({
            ...entry,
            timestamp: entry.timestamp.toISOString(),
        })),
    };
}

function deserializeWalletState(wallet: PersistedWalletState): WalletState {
    return {
        ...wallet,
        lastSync: new Date(wallet.lastSync),
        credentials: wallet.credentials.map((credential) => ({
            ...credential,
            issuanceDate: new Date(credential.issuanceDate),
            expirationDate: credential.expirationDate ? new Date(credential.expirationDate) : undefined,
            lastVerified: credential.lastVerified ? new Date(credential.lastVerified) : undefined,
        })),
        shares: wallet.shares.map((share) => ({
            ...share,
            expiry: new Date(share.expiry),
            createdAt: new Date(share.createdAt),
            accessLog: share.accessLog.map((entry) => ({
                ...entry,
                timestamp: new Date(entry.timestamp),
            })),
        })),
        consentLogs: wallet.consentLogs.map((entry) => ({
            ...entry,
            timestamp: new Date(entry.timestamp),
        })),
        notifications: wallet.notifications.map((entry) => ({
            ...entry,
            timestamp: new Date(entry.timestamp),
        })),
    };
}

async function ensureHydrated(): Promise<void> {
    if (!stateStore || hydrated) return;
    if (!hydrationPromise) {
        hydrationPromise = (async () => {
            const loaded = await stateStore.load();
            wallets.clear();
            certInIncidents.clear();

            if (loaded) {
                for (const [userId, persistedWallet] of loaded.wallets || []) {
                    wallets.set(Number(userId), deserializeWalletState(persistedWallet));
                }
                for (const [incidentId, incident] of loaded.certInIncidents || []) {
                    certInIncidents.set(incidentId, incident);
                }
            } else {
                await stateStore.save({
                    wallets: [],
                    certInIncidents: [],
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
            const payload: WalletServiceState = {
                wallets: Array.from(wallets.entries()).map(([userId, wallet]) => [
                    userId,
                    serializeWalletState(wallet),
                ]),
                certInIncidents: Array.from(certInIncidents.entries()),
            };
            await stateStore.save(payload);
        })
        .catch((error) => {
            console.error('[Wallet Service] Persist failed:', error);
        });
    await persistChain;
}

/**
 * Complete Wallet Service
 */
export class WalletService {
    private encryptionKey: string;

    constructor() {
        this.encryptionKey = process.env.WALLET_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
    }

    /**
     * Initialize or get wallet for user
     */
    async getOrCreateWallet(userId: number, did?: string): Promise<WalletState> {
        await ensureHydrated();
        let wallet = wallets.get(userId);

        if (!wallet) {
            wallet = {
                userId,
                did: did || '',
                credentials: [],
                shares: [],
                consentLogs: [],
                consentGrants: [],
                dataRequests: [],
                notifications: [],
                lastSync: new Date(),
            };
            wallets.set(userId, wallet);
            await queuePersist();
        }

        return wallet;
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
        const encryptedData = this.encrypt(JSON.stringify(credential.data));
        const hash = this.hashCredential(credential.data);

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
        this.addNotification(userId, {
            type: 'credential_received',
            title: 'New Credential Received',
            message: `${credential.issuer} issued you a new ${credential.type[0] || 'credential'}`,
            data: { credentialId: storedCredential.id },
        });

        // Simulate blockchain anchoring
        setTimeout(() => this.simulateAnchor(userId, storedCredential.id), 2000);
        await queuePersist();

        return storedCredential;
    }

    /**
     * Store multiple credentials efficiently
     */
    async storeCredentials(
        userId: number,
        credentials: Array<{
            type: string[];
            issuer: string;
            issuanceDate: Date;
            expirationDate?: Date;
            data: any;
            jwt?: string;
            category?: string;
        }>
    ): Promise<StoredCredential[]> {
        const wallet = await this.getOrCreateWallet(userId);
        const results: StoredCredential[] = [];

        for (const credential of credentials) {
            // Encrypt sensitive data
            const encryptedData = this.encrypt(JSON.stringify(credential.data));
            const hash = this.hashCredential(credential.data);

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
            results.push(storedCredential);

            // Add notification (batched notifications could be better but keeping simple)
            this.addNotification(userId, {
                type: 'credential_received',
                title: 'New Credential Received',
                message: `${credential.issuer} issued you a new ${credential.type[0] || 'credential'}`,
                data: { credentialId: storedCredential.id },
            });

            // Simulate blockchain anchoring
            setTimeout(() => this.simulateAnchor(userId, storedCredential.id), 2000);
        }

        // Single persist for all credentials
        await queuePersist();
        return results;
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
        const wallet = await this.getOrCreateWallet(userId);
        const credential = wallet.credentials.find(c => c.id === credentialId);

        if (!credential) {
            throw new Error('Credential not found');
        }

        const token = this.generateShareToken();
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
        await queuePersist();

        return share;
    }

    /**
     * Verify access to a shared credential
     */
    async accessShare(
        shareId: string,
        accessInfo: { ip: string; userAgent: string; location?: string; organization?: string }
    ): Promise<{ valid: boolean; credential?: Partial<StoredCredential>; error?: string }> {
        await ensureHydrated();
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
                const disclosedData = this.applySelectiveDisclosure(credential.data, share.disclosedFields);

                // Notify wallet owner
                this.addNotification(userId, {
                    type: 'share_access',
                    title: 'Credential Accessed',
                    message: `Your ${credential.type[0]} was verified${accessInfo.organization ? ` by ${accessInfo.organization}` : ''}`,
                    data: { shareId, accessInfo },
                });
                await queuePersist();

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

    /**
     * Revoke a share
     */
    async revokeShare(userId: number, shareId: string): Promise<boolean> {
        const wallet = await this.getOrCreateWallet(userId);
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
            await queuePersist();

            return true;
        }

        return false;
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
        await queuePersist();
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
            await queuePersist();
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
        await queuePersist();

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
        await ensureHydrated();
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

        certInIncidents.set(incident.id, incident);
        await queuePersist();
        return incident;
    }

    async listCertInIncidents(): Promise<Array<CertInIncidentRecord & { seconds_to_report_due: number }>> {
        await ensureHydrated();
        const now = Date.now();
        return Array.from(certInIncidents.values()).map((incident) => ({
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
            await queuePersist();
        }
    }

    /**
     * Create wallet backup
     */
    async createBackup(userId: number): Promise<{ backupData: string; backupKey: string }> {
        const wallet = await this.getOrCreateWallet(userId);
        const backupKey = crypto.randomBytes(32).toString('hex');

        const backupData = this.encrypt(JSON.stringify({
            userId: wallet.userId,
            did: wallet.did,
            credentials: wallet.credentials.map(c => ({
                ...c,
                data: undefined, // Use encrypted data only
            })),
            exportedAt: new Date().toISOString(),
        }), backupKey);

        wallet.backupKey = this.hashCredential(backupKey); // Store hash only
        await queuePersist();

        return { backupData, backupKey };
    }

    /**
     * Restore from backup
     */
    async restoreFromBackup(backupData: string, backupKey: string): Promise<WalletState> {
        const decrypted = this.decrypt(backupData, backupKey);
        const data = JSON.parse(decrypted);

        const wallet = await this.getOrCreateWallet(data.userId, data.did);
        // Merge credentials (avoid duplicates by hash)
        for (const cred of data.credentials) {
            if (!wallet.credentials.some(c => c.hash === cred.hash)) {
                wallet.credentials.push(cred);
            }
        }
        await queuePersist();

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

    private encrypt(plaintext: string, key?: string): string {
        const useKey = key || this.encryptionKey;
        const keyBuffer = Buffer.from(useKey.slice(0, 64), 'hex');
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
        let encrypted = cipher.update(plaintext, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();
        return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    }

    private decrypt(encrypted: string, key?: string): string {
        const useKey = key || this.encryptionKey;
        const [ivHex, authTagHex, ciphertext] = encrypted.split(':');
        const keyBuffer = Buffer.from(useKey.slice(0, 64), 'hex');
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }

    private hashCredential(data: any): string {
        const canonical = JSON.stringify(data, Object.keys(data).sort());
        return crypto.createHash('sha256').update(canonical).digest('hex');
    }

    private generateShareToken(): string {
        return crypto.randomBytes(32).toString('base64url');
    }

    private applySelectiveDisclosure(data: any, disclosedFields: string[]): any {
        if (disclosedFields.length === 0) return data;

        const result: any = {};
        for (const field of disclosedFields) {
            const parts = field.split('.');
            let source = data;
            let target = result;

            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                if (i === parts.length - 1) {
                    if (source && source[part] !== undefined) {
                        target[part] = source[part];
                    }
                } else {
                    if (source) source = source[part];
                    if (!target[part]) target[part] = {};
                    target = target[part];
                }
            }
        }

        return result;
    }

    private addNotification(userId: number, notification: Omit<WalletNotification, 'id' | 'timestamp' | 'read'>) {
        const wallet = wallets.get(userId);
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
        await ensureHydrated();
        const wallet = wallets.get(userId);
        if (wallet) {
            const credential = wallet.credentials.find(c => c.id === credentialId);
            if (credential) {
                credential.anchorStatus = 'anchored';
                credential.anchorTxHash = `0x${crypto.randomBytes(32).toString('hex')}`;
                credential.blockNumber = Math.floor(Math.random() * 1000000) + 50000000;

                this.addNotification(userId, {
                    type: 'credential_received',
                    title: 'Credential Anchored',
                    message: `Your credential has been anchored to the blockchain`,
                    data: { credentialId, txHash: credential.anchorTxHash },
                });
                await queuePersist();
            }
        }
    }
}

export const walletService = new WalletService();

export function resetWalletServiceStoreForTests(): void {
    wallets.clear();
    certInIncidents.clear();
    hydrated = false;
    hydrationPromise = null;
}
