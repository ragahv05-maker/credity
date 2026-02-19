import { PostgresStateStore } from '@credverse/shared-auth';
import {
    WalletState,
    CertInIncidentRecord,
    WalletServiceState,
    PersistedWalletState,
    PersistedStoredCredential,
    PersistedShareRecord,
    PersistedConsentLog,
    PersistedNotification
} from './types';

export class WalletStorageService {
    private wallets = new Map<number, WalletState>();
    private certInIncidents = new Map<string, CertInIncidentRecord>();
    private hasDatabase: boolean;
    private stateStore: PostgresStateStore<WalletServiceState> | null;
    private hydrated = false;
    private hydrationPromise: Promise<void> | null = null;
    private persistChain = Promise.resolve();

    constructor() {
        this.hasDatabase = typeof process.env.DATABASE_URL === 'string' && process.env.DATABASE_URL.length > 0;
        this.stateStore = this.hasDatabase
            ? new PostgresStateStore<WalletServiceState>({
                databaseUrl: process.env.DATABASE_URL as string,
                serviceKey: 'wallet-runtime-state',
            })
            : null;
    }

    async ensureHydrated(): Promise<void> {
        if (!this.stateStore || this.hydrated) return;
        if (!this.hydrationPromise) {
            this.hydrationPromise = (async () => {
                const loaded = await this.stateStore!.load();
                this.wallets.clear();
                this.certInIncidents.clear();

                if (loaded) {
                    for (const [userId, persistedWallet] of loaded.wallets || []) {
                        this.wallets.set(Number(userId), this.deserializeWalletState(persistedWallet));
                    }
                    for (const [incidentId, incident] of loaded.certInIncidents || []) {
                        this.certInIncidents.set(incidentId, incident);
                    }
                } else {
                    await this.stateStore!.save({
                        wallets: [],
                        certInIncidents: [],
                    });
                }
                this.hydrated = true;
            })();
        }
        await this.hydrationPromise;
    }

    async getOrCreateWallet(userId: number, did?: string): Promise<WalletState> {
        await this.ensureHydrated();
        let wallet = this.wallets.get(userId);

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
            this.wallets.set(userId, wallet);
            await this.queuePersist();
        }

        return wallet;
    }

    // Accessor for reading all wallets (used in accessShare)
    async getAllWallets(): Promise<Map<number, WalletState>> {
        await this.ensureHydrated();
        return this.wallets;
    }

    async createCertInIncident(incident: CertInIncidentRecord): Promise<void> {
        await this.ensureHydrated();
        this.certInIncidents.set(incident.id, incident);
        await this.queuePersist();
    }

    async listCertInIncidents(): Promise<CertInIncidentRecord[]> {
        await this.ensureHydrated();
        return Array.from(this.certInIncidents.values());
    }

    async queuePersist(): Promise<void> {
        if (!this.stateStore) return;
        this.persistChain = this.persistChain
            .then(async () => {
                const payload: WalletServiceState = {
                    wallets: Array.from(this.wallets.entries()).map(([userId, wallet]) => [
                        userId,
                        this.serializeWalletState(wallet),
                    ]),
                    certInIncidents: Array.from(this.certInIncidents.entries()),
                };
                await this.stateStore!.save(payload);
            })
            .catch((error) => {
                console.error('[Wallet Service] Persist failed:', error);
            });
        await this.persistChain;
    }

    reset(): void {
        this.wallets.clear();
        this.certInIncidents.clear();
        this.hydrated = false;
        this.hydrationPromise = null;
    }

    private serializeWalletState(wallet: WalletState): PersistedWalletState {
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

    private deserializeWalletState(wallet: PersistedWalletState): WalletState {
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
}

export const walletStorageService = new WalletStorageService();
