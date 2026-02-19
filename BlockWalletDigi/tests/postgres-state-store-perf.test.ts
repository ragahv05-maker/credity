import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PostgresStateStore } from '../../packages/shared-auth/src/postgres-state-store';

describe('PostgresStateStore Performance Optimization', () => {
    let store: PostgresStateStore<any>;
    let mockQuery: any;
    let mockPool: any;

    beforeEach(() => {
        mockQuery = vi.fn().mockResolvedValue({ rowCount: 1, rows: [] });
        mockPool = {
            query: mockQuery,
            connect: vi.fn(),
            end: vi.fn(),
        };
        store = new PostgresStateStore({
            databaseUrl: 'postgres://dummy',
            serviceKey: 'test-service',
            pool: mockPool as any,
        });
    });

    it('should save state on first call', async () => {
        const state = { key: 'value' };
        await store.save(state);
        // 1 for ensureInitialized (CREATE TABLE), 1 for INSERT
        expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should show reduced query count for rapid varying calls (Coalescing)', async () => {
        const state = { key: 'value' };

        // Simulate rapid calls
        const promises = [];
        for (let i = 0; i < 10; i++) {
            promises.push(store.save({ ...state, i }));
        }
        await Promise.all(promises);

        const queryCount = mockQuery.mock.calls.length;
        console.log('Optimized query count for 10 rapid varying calls:', queryCount);

        // Expect significantly fewer than 11 queries (1 init + 10 inserts).
        // With perfect coalescing, it should be around 2-3 queries (1 init + 1-2 inserts).
        expect(queryCount).toBeLessThan(6);
    });

    it('should skip identical saves (Deduplication)', async () => {
        const state = { key: 'value' };

        await store.save(state); // 1 init + 1 insert = 2
        await store.save(state); // Should become 0 inserts
        await store.save(state); // Should become 0 inserts

        const queryCount = mockQuery.mock.calls.length;
        console.log('Deduplication query count:', queryCount);

        // Expect: 1 init + 1 insert = 2 queries.
        expect(queryCount).toBe(2);
    });

    it('should correctly restore lastHash on load', async () => {
        const state = { key: 'loaded' };
        mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [] }); // ensureInitialized
        mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ payload: state }] }); // load

        const loaded = await store.load();
        expect(loaded).toEqual(state);

        // Now save the SAME state immediately
        await store.save(state);

        // Expect: 1 init + 1 select (load) = 2 queries.
        // Save should be skipped because hash matches loaded state.
        expect(mockQuery).toHaveBeenCalledTimes(2);
    });
});
