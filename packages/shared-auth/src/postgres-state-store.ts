import { Pool } from 'pg';

interface StoreOptions {
    databaseUrl: string;
    serviceKey: string;
    tableName?: string;
}

export class PostgresStateStore<TState extends object> {
    private readonly pool: Pool;
    private readonly serviceKey: string;
    private readonly tableName: string;
    private initPromise: Promise<void> | null = null;

    constructor(options: StoreOptions) {
        this.pool = new Pool({
            connectionString: options.databaseUrl,
            max: 5,
            idleTimeoutMillis: 30_000,
            connectionTimeoutMillis: 5_000,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
        });
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
        return (result.rows[0]?.payload as TState) || null;
    }

    async save(state: TState): Promise<void> {
        await this.ensureInitialized();
        await this.pool.query(
            `
      INSERT INTO ${this.tableName} (service_key, payload, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (service_key)
      DO UPDATE SET payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at
    `,
            [this.serviceKey, JSON.stringify(state)],
        );
    }
}
