import { describe, expect, it, vi } from 'vitest';
import { retry } from '../server/utils/retry';

describe('retry utility', () => {
    it('should return result on first attempt if successful', async () => {
        const fn = vi.fn().mockResolvedValue('success');
        const result = await retry(fn);
        expect(result).toBe('success');
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
        const fn = vi.fn()
            .mockRejectedValueOnce(new Error('fail'))
            .mockResolvedValue('success');

        const result = await retry(fn, {
            initialDelayMs: 1, // fast retry
            maxRetries: 3
        });

        expect(result).toBe('success');
        expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should throw error if max retries reached', async () => {
        const fn = vi.fn().mockRejectedValue(new Error('fail'));

        await expect(retry(fn, {
            initialDelayMs: 1,
            maxRetries: 2
        })).rejects.toThrow('fail');

        expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should call onRetry callback', async () => {
        const fn = vi.fn()
            .mockRejectedValueOnce(new Error('fail 1'))
            .mockRejectedValueOnce(new Error('fail 2'))
            .mockResolvedValue('success');

        const onRetry = vi.fn();

        await retry(fn, {
            initialDelayMs: 1,
            maxRetries: 3,
            onRetry
        });

        expect(onRetry).toHaveBeenCalledTimes(2);
        expect(onRetry).toHaveBeenNthCalledWith(1, 1, expect.any(Error));
        expect(onRetry).toHaveBeenNthCalledWith(2, 2, expect.any(Error));
    });

    it('should respect retryCondition', async () => {
        const fn = vi.fn().mockRejectedValue(new Error('fatal error'));

        await expect(retry(fn, {
            initialDelayMs: 1,
            maxRetries: 3,
            retryCondition: (error) => error.message !== 'fatal error'
        })).rejects.toThrow('fatal error');

        expect(fn).toHaveBeenCalledTimes(1); // Should not retry
    });
});
