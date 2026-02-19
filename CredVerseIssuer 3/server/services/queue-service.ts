import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { PostgresStateStore } from '@credverse/shared-auth';

/**
 * Queue Service for CredVerse Issuer
 * Handles background job processing using BullMQ + Redis
 */

// Redis connection configuration
const REDIS_URL = process.env.REDIS_URL; // No fallback - require explicit configuration

let redisConnection: IORedis | null = null;
let issuanceQueue: Queue | null = null;
let deadLetterQueue: Queue | null = null;
let issuanceWorker: Worker | null = null;
let queueEvents: QueueEvents | null = null;

const DEFAULT_JOB_ATTEMPTS = Number(process.env.ISSUANCE_JOB_ATTEMPTS || 3);
const DEFAULT_BACKOFF_DELAY_MS = Number(process.env.ISSUANCE_BACKOFF_DELAY_MS || 1000);
const DEFAULT_BACKOFF_MAX_DELAY_MS = Number(process.env.ISSUANCE_BACKOFF_MAX_DELAY_MS || 30_000);

function resolveRetryConfig(): { attempts: number; delayMs: number; maxDelayMs: number } {
    const attempts = Number.isFinite(DEFAULT_JOB_ATTEMPTS) && DEFAULT_JOB_ATTEMPTS > 0
        ? Math.floor(DEFAULT_JOB_ATTEMPTS)
        : 3;
    const delayMs = Number.isFinite(DEFAULT_BACKOFF_DELAY_MS) && DEFAULT_BACKOFF_DELAY_MS > 0
        ? Math.floor(DEFAULT_BACKOFF_DELAY_MS)
        : 1000;
    const maxDelayMs = Number.isFinite(DEFAULT_BACKOFF_MAX_DELAY_MS) && DEFAULT_BACKOFF_MAX_DELAY_MS >= delayMs
        ? Math.floor(DEFAULT_BACKOFF_MAX_DELAY_MS)
        : Math.max(delayMs, 30_000);
    return { attempts, delayMs, maxDelayMs };
}

// Job status tracking
const jobResults = new Map<string, JobResult>();

type PersistedJobResult = Omit<JobResult, 'startedAt' | 'completedAt'> & {
    startedAt?: string;
    completedAt?: string;
};

type QueueRuntimeState = {
    jobResults: Array<[string, PersistedJobResult]>;
};

const hasDatabase = typeof process.env.DATABASE_URL === 'string' && process.env.DATABASE_URL.length > 0;
const stateStore = hasDatabase
    ? new PostgresStateStore<QueueRuntimeState>({
        databaseUrl: process.env.DATABASE_URL as string,
        serviceKey: 'issuer-queue-runtime',
    })
    : null;
let hydrated = false;
let hydrationPromise: Promise<void> | null = null;
let persistChain = Promise.resolve();

export interface IssuanceJobData {
    tenantId: string;
    templateId: string;
    issuerId: string;
    recipients: Array<{
        recipient: any;
        data: any;
    }>;
}

export interface JobResult {
    jobId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    total: number;
    processed: number;
    success: number;
    failed: number;
    errors: string[];
    startedAt?: Date;
    completedAt?: Date;
}

export interface DeadLetterEntry {
    id: string;
    sourceQueue: string;
    sourceJobId: string;
    reason: string;
    failedAt: string;
    attemptsMade: number;
    payload: IssuanceJobData;
}

type DeadLetterPayload = Omit<DeadLetterEntry, 'id'>;

function serializeResult(result: JobResult): PersistedJobResult {
    return {
        ...result,
        startedAt: result.startedAt ? result.startedAt.toISOString() : undefined,
        completedAt: result.completedAt ? result.completedAt.toISOString() : undefined,
    };
}

function deserializeResult(result: PersistedJobResult): JobResult {
    return {
        ...result,
        startedAt: result.startedAt ? new Date(result.startedAt) : undefined,
        completedAt: result.completedAt ? new Date(result.completedAt) : undefined,
    };
}

async function ensureHydrated(): Promise<void> {
    if (!stateStore || hydrated) return;
    if (!hydrationPromise) {
        hydrationPromise = (async () => {
            const loaded = await stateStore.load();
            jobResults.clear();
            for (const [jobId, persisted] of loaded?.jobResults || []) {
                jobResults.set(jobId, deserializeResult(persisted));
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
            await stateStore.save({
                jobResults: Array.from(jobResults.entries()).map(([jobId, result]) => [jobId, serializeResult(result)]),
            });
        })
        .catch((error) => {
            console.error('[Queue] Failed to persist runtime state:', error);
        });
    await persistChain;
}

/**
 * Initialize the queue service
 */
export async function initQueueService(): Promise<boolean> {
    await ensureHydrated();
    const requireQueue = process.env.NODE_ENV === 'production' || process.env.REQUIRE_QUEUE === 'true';

    // Skip Redis if not configured
    if (!REDIS_URL) {
        if (requireQueue) {
            throw new Error('[Queue] REDIS_URL is required by current runtime policy');
        }
        console.log('[Queue] REDIS_URL not configured; queue-backed bulk operations are disabled');
        return false;
    }

    try {
        // Create Redis connection
        redisConnection = new IORedis(REDIS_URL, {
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
            retryStrategy: (times) => {
                if (times > 3) return null; // Stop retrying after 3 attempts
                return Math.min(times * 200, 1000);
            },
        });

        // Test connection with timeout
        const pingResult = await Promise.race([
            redisConnection.ping(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Redis connection timeout')), 3000))
        ]);

        if (pingResult !== 'PONG') throw new Error('Redis ping failed');

        console.log('[Queue] Connected to Redis');

        const retryConfig = resolveRetryConfig();

        // Create the issuance queue
        issuanceQueue = new Queue('credential-issuance', {
            connection: redisConnection,
            defaultJobOptions: {
                attempts: retryConfig.attempts,
                backoff: {
                    type: 'exponential',
                    delay: retryConfig.delayMs,
                },
                removeOnComplete: { count: 100 },
                removeOnFail: { count: 50 },
            },
        });

        deadLetterQueue = new Queue('credential-issuance-dlq', {
            connection: redisConnection,
            defaultJobOptions: {
                removeOnComplete: false,
                removeOnFail: false,
            },
        });

        // Create queue events for monitoring
        queueEvents = new QueueEvents('credential-issuance', {
            connection: redisConnection,
        });

        queueEvents.on('failed', (event) => {
            const { jobId, failedReason, prev } = event;
            const attemptsMadeRaw = (event as { attemptsMade?: unknown }).attemptsMade;
            const attemptsMade = typeof attemptsMadeRaw === 'number' && Number.isFinite(attemptsMadeRaw)
                ? attemptsMadeRaw
                : 0;
            console.warn(`[Queue] Event failed job=${jobId} attempts=${attemptsMade} prev=${prev} reason=${failedReason}`);
        });
        queueEvents.on('stalled', ({ jobId }) => {
            console.warn(`[Queue] Event stalled job=${jobId}`);
        });
        queueEvents.on('completed', ({ jobId }) => {
            console.log(`[Queue] Event completed job=${jobId}`);
        });

        console.log(`[Queue] Queue service initialized (attempts=${retryConfig.attempts}, backoff=${retryConfig.delayMs}ms exponential)`);
        return true;
    } catch (error) {
        if (requireQueue) {
            throw error;
        }
        console.warn('[Queue] Redis not available; queue-backed bulk operations are disabled');
        // Clean up failed connection
        if (redisConnection) {
            redisConnection.disconnect();
            redisConnection = null;
        }
        return false;
    }
}

async function addDeadLetterEntry(payload: DeadLetterPayload): Promise<string | null> {
    if (!deadLetterQueue) {
        return null;
    }

    const job = await deadLetterQueue.add('dead-letter', payload, {
        priority: 1,
        removeOnComplete: false,
        removeOnFail: false,
    });

    return job.id ? String(job.id) : null;
}

/**
 * Start the issuance worker
 */
export function startIssuanceWorker(
    processCredential: (tenantId: string, templateId: string, issuerId: string, recipient: any, data: any) => Promise<void>
): void {
    if (!redisConnection) {
        console.log('[Queue] Worker not started - Redis not available');
        return;
    }

    issuanceWorker = new Worker(
        'credential-issuance',
        async (job: Job<IssuanceJobData>) => {
            const { tenantId, templateId, issuerId, recipients } = job.data;
            const jobId = job.id!;

            console.log(`[Queue] Processing job ${jobId} with ${recipients.length} credentials`);

            // Initialize job result
            const result: JobResult = {
                jobId,
                status: 'processing',
                total: recipients.length,
                processed: 0,
                success: 0,
                failed: 0,
                errors: [],
                startedAt: new Date(),
            };
            jobResults.set(jobId, result);
            void queuePersist();

            // Process each credential
            for (let i = 0; i < recipients.length; i++) {
                const { recipient, data } = recipients[i];

                try {
                    await processCredential(tenantId, templateId, issuerId, recipient, data);
                    result.success++;
                } catch (error: any) {
                    result.failed++;
                    result.errors.push(`Recipient ${i + 1}: ${error.message}`);
                    console.error(`[Queue] Job ${jobId} failed for recipient ${i + 1}:`, error);
                }

                result.processed++;

                // Update job progress
                await job.updateProgress(Math.round((result.processed / result.total) * 100));
            }

            result.status = 'completed';
            result.completedAt = new Date();
            jobResults.set(jobId, result);
            void queuePersist();

            console.log(`[Queue] Job ${jobId} completed: ${result.success}/${result.total} success`);

            return result;
        },
        {
            connection: redisConnection,
            concurrency: 5, // Process 5 credentials concurrently
        }
    );

    issuanceWorker.on('failed', (job, error) => {
        console.error(`[Queue] Job ${job?.id} failed:`, error);
        if (job?.id && job.data) {
            const sourceJobId = String(job.id);
            const configuredAttempts = typeof job.opts.attempts === 'number' && job.opts.attempts > 0 ? job.opts.attempts : 1;
            const attemptsMadeRaw = job.attemptsMade;
            const attemptsMade = typeof attemptsMadeRaw === 'number' && Number.isFinite(attemptsMadeRaw)
                ? attemptsMadeRaw
                : 0;
            const hasRetriesRemaining = attemptsMade < configuredAttempts;
            const result = jobResults.get(sourceJobId);

            if (result) {
                if (hasRetriesRemaining) {
                    result.status = 'processing';
                    result.errors.push(`Attempt ${attemptsMade}/${configuredAttempts} failed: ${error.message}`);
                } else {
                    result.status = 'failed';
                    result.errors.push(`Job failed after ${attemptsMade} attempts: ${error.message}`);
                }
                jobResults.set(sourceJobId, result);
                void queuePersist();
            }

            if (hasRetriesRemaining) {
                console.warn(`[Queue] Job ${sourceJobId} attempt ${attemptsMade}/${configuredAttempts} failed, retrying`);
                return;
            }

            const payload: DeadLetterPayload = {
                sourceQueue: 'credential-issuance',
                sourceJobId,
                reason: error.message,
                failedAt: new Date().toISOString(),
                attemptsMade,
                payload: job.data,
            };

            void addDeadLetterEntry(payload)
                .then((entryId) => {
                    if (entryId) {
                        console.warn(`[Queue] Job ${sourceJobId} moved to dead-letter queue entry ${entryId}`);
                    } else {
                        console.warn(`[Queue] Dead-letter queue unavailable, could not persist failed job ${sourceJobId}`);
                    }
                })
                .catch((dlqError) => {
                    console.error(`[Queue] Failed to persist dead-letter entry for ${sourceJobId}:`, dlqError);
                });
        }
    });

    console.log('[Queue] Issuance worker started');
}

/**
 * Add a bulk issuance job to the queue
 */
export async function addBulkIssuanceJob(data: IssuanceJobData): Promise<{ jobId: string; queued: boolean }> {
    if (!issuanceQueue) {
        throw new Error('Queue service unavailable');
    }

    const job = await issuanceQueue.add('bulk-issue', data, {
        priority: data.recipients.length > 100 ? 2 : 1, // Lower priority for large batches
    });

    // Initialize job result
    jobResults.set(job.id!, {
        jobId: job.id!,
        status: 'pending',
        total: data.recipients.length,
        processed: 0,
        success: 0,
        failed: 0,
        errors: [],
    });
    await queuePersist();

    console.log(`[Queue] Bulk issuance job ${job.id} added with ${data.recipients.length} credentials`);

    return { jobId: job.id!, queued: true };
}

/**
 * Get job status
 */
export async function getJobStatus(jobId: string): Promise<JobResult | null> {
    await ensureHydrated();
    // Check in-memory results first
    const memoryResult = jobResults.get(jobId);
    if (memoryResult) {
        return memoryResult;
    }

    // Check queue if available
    if (issuanceQueue) {
        const job = await issuanceQueue.getJob(jobId);
        if (job) {
            const state = await job.getState();
            const progress = job.progress as number;

            return {
                jobId,
                status: state === 'completed' ? 'completed' : state === 'failed' ? 'failed' : 'processing',
                total: job.data.recipients.length,
                processed: Math.round((progress / 100) * job.data.recipients.length),
                success: 0,
                failed: 0,
                errors: [],
            };
        }
    }

    return null;
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
} | null> {
    if (!issuanceQueue) {
        return null;
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
        issuanceQueue.getWaitingCount(),
        issuanceQueue.getActiveCount(),
        issuanceQueue.getCompletedCount(),
        issuanceQueue.getFailedCount(),
        issuanceQueue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
}

export async function getQueueReliabilityConfig(): Promise<{
    attempts: number;
    backoff: {
        type: 'exponential';
        delayMs: number;
        maxDelayMs: number;
    };
    deadLetterQueueAvailable: boolean;
}> {
    const retry = resolveRetryConfig();
    return {
        attempts: retry.attempts,
        backoff: {
            type: 'exponential',
            delayMs: retry.delayMs,
            maxDelayMs: retry.maxDelayMs,
        },
        deadLetterQueueAvailable: deadLetterQueue !== null,
    };
}

export async function getDeadLetterJobs(limit = 50): Promise<DeadLetterEntry[]> {
    if (!deadLetterQueue) {
        return [];
    }

    const boundedLimit = Math.max(1, Math.min(limit, 200));
    const jobs = await deadLetterQueue.getJobs(
        ['waiting', 'delayed', 'active', 'failed', 'completed'],
        0,
        boundedLimit - 1,
        true,
    );

    return jobs.map((job) => {
        const payload = job.data as DeadLetterPayload;
        return {
            id: String(job.id),
            sourceQueue: payload.sourceQueue,
            sourceJobId: payload.sourceJobId,
            reason: payload.reason,
            failedAt: payload.failedAt,
            attemptsMade: payload.attemptsMade,
            payload: payload.payload,
        };
    });
}

export async function replayDeadLetterJob(entryId: string): Promise<{ deadLetterEntryId: string; replayJobId: string }> {
    await ensureHydrated();
    if (!issuanceQueue || !deadLetterQueue) {
        throw new Error('Queue service unavailable');
    }

    const deadLetterJob = await deadLetterQueue.getJob(entryId);
    if (!deadLetterJob) {
        throw new Error('Dead-letter entry not found');
    }

    const payload = deadLetterJob.data as DeadLetterPayload;
    const replayed = await issuanceQueue.add('bulk-issue', payload.payload, {
        priority: payload.payload.recipients.length > 100 ? 2 : 1,
    });

    const replayJobId = String(replayed.id);
    jobResults.set(replayJobId, {
        jobId: replayJobId,
        status: 'pending',
        total: payload.payload.recipients.length,
        processed: 0,
        success: 0,
        failed: 0,
        errors: [],
    });
    await queuePersist();

    await deadLetterJob.remove();
    return {
        deadLetterEntryId: entryId,
        replayJobId,
    };
}

/**
 * Check if queue service is available
 */
export function isQueueAvailable(): boolean {
    return issuanceQueue !== null;
}

/**
 * Gracefully shutdown queue service
 */
export async function shutdownQueueService(): Promise<void> {
    if (issuanceWorker) {
        await issuanceWorker.close();
    }
    if (queueEvents) {
        await queueEvents.close();
    }
    if (issuanceQueue) {
        await issuanceQueue.close();
    }
    if (deadLetterQueue) {
        await deadLetterQueue.close();
    }
    if (redisConnection) {
        await redisConnection.quit();
    }
    console.log('[Queue] Service shutdown complete');
}
