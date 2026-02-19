import { Pool } from 'pg';
import crypto from 'crypto';

interface StoreOptions {
    databaseUrl: string;
    serviceKey: string;
    tableName?: string;
    pool?: Pool;
}

export class PostgresStateStore<TState extends object> {
    private readonly pool: Pool;
    private readonly serviceKey: string;
    private readonly tableName: string;
    private initPromise: Promise<void> | null = null;

    // Optimization state
    private lastHash: string | null = null;
    private isSaving = false;
    private pendingState: TState | null = null;
    private pendingResolvers: Array<() => void> = [];
    private pendingRejectors: Array<(err: Error) => void> = [];

    constructor(options: StoreOptions) {
        if (options.pool) {
            this.pool = options.pool;
        } else {
            this.pool = new Pool({
                connectionString: options.databaseUrl,
                max: 5,
                idleTimeoutMillis: 30_000,
                connectionTimeoutMillis: 5_000,
                ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
            });
        }
        this.serviceKey = options.serviceKey;
        this.tableName = options.tableName || 'credverse_state_store';
    }

    private async ensureInitialized(): Promise<void> {
        if (!this.initPromise) {
            this.initPromise = this.initialize();
        }
        await this.initPromise;
    }

    private async initialize(): Promise<void> {
        const query = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        service_key TEXT PRIMARY KEY,
        payload JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;
        await this.pool.query(query);
    }

    async load(): Promise<TState | null> {
        await this.ensureInitialized();
        const result = await this.pool.query(
            `SELECT payload FROM ${this.tableName} WHERE service_key = $1 LIMIT 1`,
            [this.serviceKey],
        );
        if (result.rowCount === 0) {
            return null;
        }
        const state = (result.rows[0]?.payload as TState) || null;
        if (state) {
             this.lastHash = crypto.createHash('sha256').update(JSON.stringify(state)).digest('hex');
        }
        return state;
    }

    async save(state: TState): Promise<void> {
        await this.ensureInitialized();

        const json = JSON.stringify(state);
        const hash = crypto.createHash('sha256').update(json).digest('hex');

        if (this.lastHash === hash) {
            return;
        }

        if (this.isSaving) {
            this.pendingState = state;
            return new Promise<void>((resolve, reject) => {
                this.pendingResolvers.push(resolve);
                this.pendingRejectors.push(reject);
            });
        }

        this.isSaving = true;
        try {
            await this.performSave(json);
            this.lastHash = hash;
        } finally {
            this.isSaving = false;
            this.processPending();
        }
    }

    private async performSave(json: string): Promise<void> {
        await this.pool.query(
            `
      INSERT INTO ${this.tableName} (service_key, payload, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (service_key)
      DO UPDATE SET payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at
    `,
            [this.serviceKey, json],
        );
    }

    private processPending() {
        if (!this.pendingState) return;

        const state = this.pendingState;
        const resolvers = this.pendingResolvers;
        const rejectors = this.pendingRejectors;

        this.pendingState = null;
        this.pendingResolvers = [];
        this.pendingRejectors = [];

        this.save(state)
            .then(() => {
                resolvers.forEach((r) => r());
            })
            .catch((err) => {
                rejectors.forEach((r) => r(err));
            });
    }
}
