import { PostgresStateStore } from './postgres-state-store.js';

export interface PersistentServiceOptions<TState extends object, TPersisted extends object = TState> {
    serviceKey: string;
    databaseUrl?: string;
    defaultState: TState;
    serialize?: (state: TState) => TPersisted;
    deserialize?: (persisted: TPersisted) => TState;
}

export abstract class PersistentService<TState extends object, TPersisted extends object = TState> {
    protected state: TState;
    private store: PostgresStateStore<TPersisted> | null = null;
    private hydrated = false;
    private hydrationPromise: Promise<void> | null = null;
    private persistChain = Promise.resolve();
    private readonly serviceKey: string;
    private readonly serialize: (state: TState) => TPersisted;
    private readonly deserialize: (persisted: TPersisted) => TState;

    constructor(options: PersistentServiceOptions<TState, TPersisted>) {
        this.serviceKey = options.serviceKey;
        this.state = options.defaultState;

        // Default pass-through if no transformer provided
        this.serialize = options.serialize || ((s) => s as unknown as TPersisted);
        this.deserialize = options.deserialize || ((p) => p as unknown as TState);

        const dbUrl = options.databaseUrl || process.env.DATABASE_URL;
        if (dbUrl && dbUrl.length > 0) {
            this.store = new PostgresStateStore<TPersisted>({
                databaseUrl: dbUrl,
                serviceKey: this.serviceKey,
            });
        }
    }

    protected async ensureHydrated(): Promise<void> {
        if (!this.store || this.hydrated) return;
        if (!this.hydrationPromise) {
            this.hydrationPromise = (async () => {
                try {
                    const loaded = await this.store!.load();
                    if (loaded) {
                        this.state = this.deserialize(loaded);
                    }
                    this.hydrated = true;
                } catch (error) {
                    console.error(`[${this.serviceKey}] Failed to hydrate state:`, error);
                    this.hydrationPromise = null;
                    throw error;
                }
            })();
        }
        await this.hydrationPromise;
    }

    protected async queuePersist(): Promise<void> {
        if (!this.store) return;
        this.persistChain = this.persistChain
            .then(async () => {
                const payload = this.serialize(this.state);
                await this.store!.save(payload);
            })
            .catch((error) => {
                console.error(`[${this.serviceKey}] Persist failed:`, error);
            });
        await this.persistChain;
    }

    public async resetState(newState?: TState): Promise<void> {
        this.hydrated = false;
        this.hydrationPromise = null;
        if (newState) {
            this.state = newState;
        }
    }

    public getState(): TState {
        return this.state;
    }
}
