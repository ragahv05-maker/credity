import crypto from "crypto";
import { relayerService } from "./relayer";
import { PostgresStateStore } from "@credverse/shared-auth";

export type AnchorBatchStatus = "queued" | "submitted" | "confirmed" | "failed";

interface AnchorAttempt {
  attemptedAt: string;
  status: "submitted" | "confirmed" | "failed";
  txHash?: string;
  error?: string;
}

export interface AnchorDeadLetterEntry {
  batchId: string;
  reason: string;
  failedAt: string;
  attempts: number;
  txHash?: string;
  nextRetryAt?: string;
  retryAfterSeconds?: number;
}

export interface AnchorBatchRecord {
  batchId: string;
  credentialIds: string[];
  leafHashes: string[];
  merkleRoot: string;
  proofs: Record<string, string[]>;
  status: AnchorBatchStatus;
  txHash?: string;
  error?: string;
  attemptCount: number;
  lastAttemptAt?: string;
  confirmedAt?: string;
  history: AnchorAttempt[];
  createdAt: string;
  updatedAt: string;
}

export class AnchorBatchError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "ANCHOR_BATCH_DUPLICATE"
      | "ANCHOR_BATCH_CONFLICT"
      | "ANCHOR_BATCH_NOT_FOUND",
    public readonly status: number,
    public readonly batchId?: string,
  ) {
    super(message);
    this.name = "AnchorBatchError";
  }
}

const batches = new Map<string, AnchorBatchRecord>();
const credentialToBatch = new Map<
  string,
  { batchId: string; proof: string[]; root: string }
>();
const rootToBatchId = new Map<string, string>();
const deadLetters = new Map<string, AnchorDeadLetterEntry>();
const CONFIRMATION_DELAY_MS = Number(
  process.env.ANCHOR_CONFIRMATION_DELAY_MS || 2000,
);
const ANCHOR_RETRY_BASE_DELAY_MS = Number(
  process.env.ANCHOR_RETRY_BASE_DELAY_MS || 5000,
);
const ANCHOR_RETRY_MAX_DELAY_MS = Number(
  process.env.ANCHOR_RETRY_MAX_DELAY_MS || 300000,
);

function computeRetryDelayMs(attemptCount: number): number {
  const base =
    Number.isFinite(ANCHOR_RETRY_BASE_DELAY_MS) &&
    ANCHOR_RETRY_BASE_DELAY_MS > 0
      ? Math.floor(ANCHOR_RETRY_BASE_DELAY_MS)
      : 5000;
  const max =
    Number.isFinite(ANCHOR_RETRY_MAX_DELAY_MS) &&
    ANCHOR_RETRY_MAX_DELAY_MS >= base
      ? Math.floor(ANCHOR_RETRY_MAX_DELAY_MS)
      : 300000;
  const exponential = base * Math.pow(2, Math.max(0, attemptCount - 1));
  return Math.min(exponential, max);
}
type AnchorBatchState = {
  batches: Array<[string, AnchorBatchRecord]>;
  credentialToBatch: Array<
    [string, { batchId: string; proof: string[]; root: string }]
  >;
  deadLetters: Array<[string, AnchorDeadLetterEntry]>;
};
const hasDatabase =
  typeof process.env.DATABASE_URL === "string" &&
  process.env.DATABASE_URL.length > 0;
const stateStore = hasDatabase
  ? new PostgresStateStore<AnchorBatchState>({
      databaseUrl: process.env.DATABASE_URL as string,
      serviceKey: "issuer-anchor-batches",
    })
  : null;
let hydrated = false;
let hydrationPromise: Promise<void> | null = null;
let persistChain = Promise.resolve();

function hashHex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function combineHashes(a: string, b: string): string {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return crypto
    .createHash("sha256")
    .update(Buffer.concat([left, right]))
    .digest("hex");
}

function buildMerkleTree(leaves: string[]): {
  root: string;
  proofs: string[][];
} {
  if (leaves.length === 0) {
    return { root: hashHex(""), proofs: [] };
  }

  let level = [...leaves];
  const levels: string[][] = [level];
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] ?? left;
      next.push(combineHashes(left, right));
    }
    level = next;
    levels.push(level);
  }

  const proofs: string[][] = leaves.map(() => []);
  for (let levelIndex = 0; levelIndex < levels.length - 1; levelIndex++) {
    const currentLevel = levels[levelIndex];
    for (let leafIndex = 0; leafIndex < leaves.length; leafIndex++) {
      const pairIndex = leafIndex ^ 1;
      const sibling = currentLevel[pairIndex] ?? currentLevel[leafIndex];
      proofs[leafIndex].push(sibling);
    }
  }

  return { root: levels[levels.length - 1][0], proofs };
}

async function ensureHydrated(): Promise<void> {
  if (!stateStore || hydrated) return;
  if (!hydrationPromise) {
    hydrationPromise = (async () => {
      const loaded = await stateStore.load();
      batches.clear();
      credentialToBatch.clear();
      rootToBatchId.clear();
      deadLetters.clear();

      for (const [batchId, batch] of loaded?.batches || []) {
        batches.set(batchId, batch);
        rootToBatchId.set(batch.merkleRoot, batchId);
      }
      for (const [credentialId, proof] of loaded?.credentialToBatch || []) {
        credentialToBatch.set(credentialId, proof);
      }
      for (const [batchId, deadLetter] of loaded?.deadLetters || []) {
        deadLetters.set(batchId, deadLetter);
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
        batches: Array.from(batches.entries()),
        credentialToBatch: Array.from(credentialToBatch.entries()),
        deadLetters: Array.from(deadLetters.entries()),
      });
    })
    .catch((error) => {
      console.error("[AnchorBatch] Persist failed:", error);
    });
  await persistChain;
}

export async function createAnchorBatch(
  credentialIds: string[],
  hashInputs: string[],
): Promise<AnchorBatchRecord> {
  await ensureHydrated();
  if (
    credentialIds.length === 0 ||
    credentialIds.length !== hashInputs.length
  ) {
    throw new Error(
      "credentialIds and hashInputs must be non-empty and equal length",
    );
  }

  const leafHashes = hashInputs.map((value) =>
    value.replace(/^0x/, "").toLowerCase(),
  );
  const { root, proofs } = buildMerkleTree(leafHashes);

  const existingBatchId = rootToBatchId.get(root);
  if (existingBatchId) {
    const existingBatch = batches.get(existingBatchId);
    if (existingBatch) {
      return existingBatch;
    }
  }

  for (const credentialId of credentialIds) {
    const existing = credentialToBatch.get(credentialId);
    if (existing && existing.root !== root) {
      throw new AnchorBatchError(
        `Credential ${credentialId} already belongs to batch ${existing.batchId}`,
        "ANCHOR_BATCH_CONFLICT",
        409,
        existing.batchId,
      );
    }
  }

  const batchId = `batch_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  const now = new Date().toISOString();

  const record: AnchorBatchRecord = {
    batchId,
    credentialIds,
    leafHashes,
    merkleRoot: root,
    proofs: {},
    status: "queued",
    attemptCount: 0,
    history: [],
    createdAt: now,
    updatedAt: now,
  };

  credentialIds.forEach((credentialId, index) => {
    record.proofs[credentialId] = proofs[index];
    credentialToBatch.set(credentialId, {
      batchId,
      proof: proofs[index],
      root,
    });
  });

  batches.set(batchId, record);
  rootToBatchId.set(root, batchId);
  await queuePersist();
  return record;
}

function scheduleBatchConfirmation(batchId: string): void {
  const delayMs =
    Number.isFinite(CONFIRMATION_DELAY_MS) && CONFIRMATION_DELAY_MS >= 0
      ? CONFIRMATION_DELAY_MS
      : 2000;

  setTimeout(() => {
    const batch = batches.get(batchId);
    if (!batch || batch.status !== "submitted") {
      return;
    }

    const confirmedAt = new Date().toISOString();
    batch.status = "confirmed";
    batch.confirmedAt = confirmedAt;
    batch.updatedAt = confirmedAt;
    batch.history.push({
      attemptedAt: confirmedAt,
      status: "confirmed",
      txHash: batch.txHash,
    });

    batches.set(batchId, batch);
    deadLetters.delete(batchId);
    void queuePersist();
  }, delayMs);
}

export async function anchorBatch(batchId: string): Promise<AnchorBatchRecord> {
  await ensureHydrated();
  const batch = batches.get(batchId);
  if (!batch) {
    throw new AnchorBatchError(
      "Batch not found",
      "ANCHOR_BATCH_NOT_FOUND",
      404,
    );
  }

  if (batch.status === "submitted" || batch.status === "confirmed") {
    return batch;
  }

  const attemptAt = new Date().toISOString();
  batch.attemptCount += 1;
  batch.lastAttemptAt = attemptAt;

  try {
    const txHash = await relayerService.anchorCredential(
      `0x${batch.merkleRoot}`,
    );
    batch.status = "submitted";
    batch.txHash = txHash;
    batch.error = undefined;
    batch.history.push({
      attemptedAt: attemptAt,
      status: "submitted",
      txHash,
    });
    batch.updatedAt = new Date().toISOString();
    deadLetters.delete(batchId);
    scheduleBatchConfirmation(batchId);
  } catch (error: any) {
    batch.status = "failed";
    const message = error?.message || "Unknown anchor failure";
    batch.error = message;
    batch.history.push({
      attemptedAt: attemptAt,
      status: "failed",
      error: message,
    });
    batch.updatedAt = new Date().toISOString();
    const retryDelayMs = computeRetryDelayMs(batch.attemptCount);
    deadLetters.set(batchId, {
      batchId,
      reason: message,
      failedAt: batch.updatedAt,
      attempts: batch.attemptCount,
      txHash: batch.txHash,
      nextRetryAt: new Date(Date.now() + retryDelayMs).toISOString(),
      retryAfterSeconds: Math.max(1, Math.ceil(retryDelayMs / 1000)),
    });
  }

  batches.set(batchId, batch);
  await queuePersist();
  return batch;
}

export async function getAnchorBatch(
  batchId: string,
): Promise<AnchorBatchRecord | null> {
  await ensureHydrated();
  return batches.get(batchId) ?? null;
}

export async function getAnchorProof(
  credentialId: string,
): Promise<{ batchId: string; root: string; proof: string[] } | null> {
  await ensureHydrated();
  return credentialToBatch.get(credentialId) ?? null;
}

export async function getAnchorDeadLetters(
  limit = 50,
): Promise<AnchorDeadLetterEntry[]> {
  await ensureHydrated();
  const boundedLimit = Math.max(1, Math.min(limit, 200));
  return Array.from(deadLetters.values()).slice(0, boundedLimit);
}

export async function replayAnchorBatch(
  batchId: string,
): Promise<AnchorBatchRecord> {
  await ensureHydrated();
  const batch = batches.get(batchId);
  if (!batch) {
    throw new AnchorBatchError(
      "Batch not found",
      "ANCHOR_BATCH_NOT_FOUND",
      404,
    );
  }

  if (batch.status !== "failed") {
    return batch;
  }

  batch.status = "queued";
  batch.error = undefined;
  batch.updatedAt = new Date().toISOString();
  batches.set(batchId, batch);
  deadLetters.delete(batchId);
  await queuePersist();

  return anchorBatch(batchId);
}

export function resetAnchorBatchStoreForTests(): void {
  batches.clear();
  credentialToBatch.clear();
  rootToBatchId.clear();
  deadLetters.clear();
  hydrated = false;
  hydrationPromise = null;
}
