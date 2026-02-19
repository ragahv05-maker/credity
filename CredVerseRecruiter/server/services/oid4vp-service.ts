import crypto from 'crypto';
import { PostgresStateStore } from '@credverse/shared-auth';

type Oid4vpRequestState = {
    vpRequests: Array<[string, { id: string; nonce: string; createdAt: number; purpose: string; state?: string }]>;
};

export interface VpRequest {
    id: string;
    nonce: string;
    createdAt: number;
    purpose: string;
    state?: string;
}

const VP_REQUEST_TTL_MS = Number(process.env.OID4VP_REQUEST_TTL_MS || 15 * 60 * 1000);

class Oid4vpService {
    private vpRequests = new Map<string, VpRequest>();
    private hasDatabase = typeof process.env.DATABASE_URL === 'string' && process.env.DATABASE_URL.length > 0;
    private stateStore = this.hasDatabase
        ? new PostgresStateStore<Oid4vpRequestState>({
            databaseUrl: process.env.DATABASE_URL as string,
            serviceKey: 'recruiter-oid4vp-requests',
        })
        : null;

    private hydrated = false;
    private hydrationPromise: Promise<void> | null = null;
    private persistChain = Promise.resolve();

    constructor() {
        // Optional: periodic cleanup
        setInterval(() => this.pruneExpiredRequests(), 60 * 1000).unref();
    }

    private async ensureHydrated(): Promise<void> {
        if (!this.stateStore || this.hydrated) return;
        if (!this.hydrationPromise) {
            this.hydrationPromise = (async () => {
                const loaded = await this.stateStore!.load();
                this.vpRequests.clear();
                for (const [requestId, request] of loaded?.vpRequests || []) {
                    this.vpRequests.set(requestId, request);
                }
                this.hydrated = true;
            })();
        }
        await this.hydrationPromise;
    }

    private async queuePersist(): Promise<void> {
        if (!this.stateStore) return;
        this.persistChain = this.persistChain
            .then(async () => {
                await this.stateStore!.save({
                    vpRequests: Array.from(this.vpRequests.entries()),
                });
            })
            .catch((error) => {
                console.error('[OID4VP] Persist failed:', error);
            });
        await this.persistChain;
    }

    async pruneExpiredRequests(): Promise<boolean> {
        await this.ensureHydrated();
        let changed = false;
        const now = Date.now();
        for (const [requestId, request] of this.vpRequests.entries()) {
            if ((request.createdAt + VP_REQUEST_TTL_MS) < now) {
                this.vpRequests.delete(requestId);
                changed = true;
            }
        }
        if (changed) {
            await this.queuePersist();
        }
        return changed;
    }

    async createRequest(purpose: string, state?: string): Promise<VpRequest> {
        await this.ensureHydrated();
        await this.pruneExpiredRequests();

        const requestId = `vp_req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const nonce = crypto.randomBytes(16).toString('hex');
        const createdAt = Date.now();

        const request: VpRequest = {
            id: requestId,
            nonce,
            createdAt,
            purpose: purpose.trim(),
            state,
        };

        this.vpRequests.set(requestId, request);
        await this.queuePersist();
        return request;
    }

    async getRequest(requestId: string): Promise<VpRequest | undefined> {
        await this.ensureHydrated();
        // Opportunistic prune, but maybe not strictly necessary on every get
        await this.pruneExpiredRequests();
        return this.vpRequests.get(requestId);
    }

    async deleteRequest(requestId: string): Promise<boolean> {
        await this.ensureHydrated();
        const deleted = this.vpRequests.delete(requestId);
        if (deleted) {
            await this.queuePersist();
        }
        return deleted;
    }

    getTtlMs(): number {
        return VP_REQUEST_TTL_MS;
    }
}

export const oid4vpService = new Oid4vpService();
