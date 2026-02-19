/**
 * Retry utility with exponential backoff
 */

interface RetryOptions {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffFactor?: number;
    onRetry?: (attempt: number, error: Error) => void;
    retryCondition?: (error: Error) => boolean;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry' | 'retryCondition'>> = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffFactor: 2,
};

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;

            // Check if we should retry
            if (opts.retryCondition && !opts.retryCondition(lastError)) {
                throw lastError;
            }

            // Don't retry on last attempt
            if (attempt === opts.maxRetries) {
                break;
            }

            // Calculate delay with exponential backoff
            const delay = Math.min(
                opts.initialDelayMs * Math.pow(opts.backoffFactor, attempt),
                opts.maxDelayMs
            );

            // Call retry callback if provided
            if (opts.onRetry) {
                opts.onRetry(attempt + 1, lastError);
            }

            console.log(`[Retry] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
            await sleep(delay);
        }
    }

    throw lastError;
}

/**
 * Fetch with retry
 */
export async function fetchWithRetry(
    url: string,
    options: RequestInit = {},
    retryOptions: RetryOptions = {}
): Promise<Response> {
    return retry(
        async () => {
            const response = await fetch(url, options);

            // Retry on server errors
            if (response.status >= 500) {
                throw new Error(`Server error: ${response.status}`);
            }

            return response;
        },
        {
            ...retryOptions,
            // Only retry on network errors and 5xx
            retryCondition: (error) => {
                const message = error.message.toLowerCase();
                return (
                    message.includes('network') ||
                    message.includes('fetch') ||
                    message.includes('server error')
                );
            },
        }
    );
}

/**
 * Circuit breaker for external APIs
 */
interface CircuitBreakerOptions {
    failureThreshold?: number;
    resetTimeoutMs?: number;
}

type CircuitState = 'closed' | 'open' | 'half-open';

export class CircuitBreaker {
    private state: CircuitState = 'closed';
    private failures = 0;
    private lastFailureTime: number | null = null;
    private readonly failureThreshold: number;
    private readonly resetTimeoutMs: number;

    constructor(options: CircuitBreakerOptions = {}) {
        this.failureThreshold = options.failureThreshold ?? 5;
        this.resetTimeoutMs = options.resetTimeoutMs ?? 60000;
    }

    async execute<T>(fn: () => Promise<T>): Promise<T> {
        if (this.state === 'open') {
            if (Date.now() - (this.lastFailureTime ?? 0) > this.resetTimeoutMs) {
                this.state = 'half-open';
                console.log('[CircuitBreaker] Moving to half-open state');
            } else {
                throw new Error('Circuit breaker is open');
            }
        }

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    private onSuccess(): void {
        this.failures = 0;
        if (this.state === 'half-open') {
            this.state = 'closed';
            console.log('[CircuitBreaker] Circuit closed');
        }
    }

    private onFailure(): void {
        this.failures++;
        this.lastFailureTime = Date.now();

        if (this.failures >= this.failureThreshold) {
            this.state = 'open';
            console.log('[CircuitBreaker] Circuit opened after', this.failures, 'failures');
        }
    }

    getState(): CircuitState {
        return this.state;
    }

    reset(): void {
        this.state = 'closed';
        this.failures = 0;
        this.lastFailureTime = null;
    }
}

// Shared circuit breaker instances
export const blockchainCircuitBreaker = new CircuitBreaker({
    failureThreshold: 3,
    resetTimeoutMs: 30000,
});

export const digilockerCircuitBreaker = new CircuitBreaker({
    failureThreshold: 5,
    resetTimeoutMs: 60000,
});
