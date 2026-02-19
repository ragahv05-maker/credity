import { describe, it, expect, vi, beforeAll } from 'vitest';

// Mock DB latency
const DB_LATENCY_MS = 50;

// Mock PostgresStateStore
vi.mock('@credverse/shared-auth', () => {
    return {
        PostgresStateStore: class {
            constructor() {}
            async load() {
                return null; // Empty initial state
            }
            async save(data: any) {
                // Simulate DB write latency
                await new Promise(resolve => setTimeout(resolve, DB_LATENCY_MS));
            }
        }
    };
});

describe('WalletService Benchmark', () => {
    let walletService: any;
    let resetWalletServiceStoreForTests: any;

    beforeAll(async () => {
        // Ensure DATABASE_URL is set so stateStore is created
        process.env.DATABASE_URL = 'postgres://mock:5432/db';

        // Dynamic import to ensure env var is seen during module initialization
        const mod = await import('../server/services/wallet-service');
        walletService = mod.walletService;
        resetWalletServiceStoreForTests = mod.resetWalletServiceStoreForTests;

        resetWalletServiceStoreForTests();
    });

    it('measures sequential storeCredential performance', async () => {
        const userId = 123;
        const count = 10;
        const credentials = Array.from({ length: count }, (_, i) => ({
            type: ['VerifiableCredential', 'TestCredential'],
            issuer: 'TestIssuer',
            issuanceDate: new Date(),
            data: { name: `Test Credential ${i}` },
            category: 'other'
        }));

        const startTime = Date.now();

        for (const cred of credentials) {
            await walletService.storeCredential(userId, cred);
        }

        const endTime = Date.now();
        const duration = endTime - startTime;

        console.log(`\nSequential store of ${count} credentials took: ${duration}ms`);
        console.log(`Average per credential: ${duration / count}ms`);

        // With 50ms latency per save, 10 sequential saves should take >= 500ms
        expect(duration).toBeGreaterThanOrEqual(count * DB_LATENCY_MS);
    });

    it('measures batched storeCredentials performance', async () => {
        const userId = 123;
        const count = 10;
        const credentials = Array.from({ length: count }, (_, i) => ({
            type: ['VerifiableCredential', 'TestCredential'],
            issuer: 'TestIssuer',
            issuanceDate: new Date(),
            data: { name: `Test Credential ${i}` },
            category: 'other'
        }));

        const startTime = Date.now();

        await walletService.storeCredentials(userId, credentials);

        const endTime = Date.now();
        const duration = endTime - startTime;

        console.log(`\nBatched store of ${count} credentials took: ${duration}ms`);
        console.log(`Average per credential: ${duration / count}ms`);

        // Should be much faster. Ideally close to DB_LATENCY_MS (50ms) + overhead.
        // It shouldn't take more than 2 * DB_LATENCY_MS (to be safe).
        expect(duration).toBeLessThan(count * DB_LATENCY_MS);
        expect(duration).toBeLessThan(200); // Expecting ~50-60ms
    });
});
