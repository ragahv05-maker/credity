import { beforeEach, describe, expect, it, vi } from "vitest";

const { anchorCredentialMock } = vi.hoisted(() => ({
  anchorCredentialMock: vi.fn(),
}));

vi.mock("../server/services/relayer", () => ({
  relayerService: {
    anchorCredential: anchorCredentialMock,
  },
}));

import {
  anchorBatch,
  createAnchorBatch,
  getAnchorDeadLetters,
  replayAnchorBatch,
  resetAnchorBatchStoreForTests,
  AnchorBatchError,
} from "../server/services/anchor-batch-service";

describe("anchor batch service", () => {
  beforeEach(() => {
    anchorCredentialMock.mockReset();
    resetAnchorBatchStoreForTests();
  });

  it("creates batches in queued state", async () => {
    const batch = await createAnchorBatch(["cred-1"], ["aa".repeat(32)]);

    expect(batch.status).toBe("queued");
    expect(batch.attemptCount).toBe(0);
    expect(batch.history).toEqual([]);
  });

  it("moves queued batches to submitted when relayer accepts the root", async () => {
    anchorCredentialMock.mockResolvedValue(`0x${"a".repeat(64)}`);
    const batch = await createAnchorBatch(["cred-2"], ["bb".repeat(32)]);

    const anchored = await anchorBatch(batch.batchId);

    expect(anchored.status).toBe("submitted");
    expect(anchored.txHash).toBe(`0x${"a".repeat(64)}`);
    expect(anchored.attemptCount).toBe(1);
    expect(anchored.history.some((entry) => entry.status === "submitted")).toBe(
      true,
    );
  });

  it("moves failed batches to dead-letter and supports replay", async () => {
    anchorCredentialMock
      .mockRejectedValueOnce(new Error("relayer unavailable"))
      .mockResolvedValueOnce(`0x${"c".repeat(64)}`);
    const batch = await createAnchorBatch(["cred-3"], ["cc".repeat(32)]);

    const failed = await anchorBatch(batch.batchId);
    expect(failed.status).toBe("failed");
    expect(failed.error).toContain("relayer unavailable");
    const deadLetters = await getAnchorDeadLetters();
    expect(deadLetters).toHaveLength(1);
    expect(deadLetters[0].retryAfterSeconds).toBeGreaterThan(0);
    expect(deadLetters[0].nextRetryAt).toBeTruthy();

    const replayed = await replayAnchorBatch(batch.batchId);
    expect(replayed.status).toBe("submitted");
    await expect(getAnchorDeadLetters()).resolves.toHaveLength(0);
  });

  it("returns existing batch for duplicate anchor requests with same root", async () => {
    const first = await createAnchorBatch(["cred-dup"], ["dd".repeat(32)]);
    const second = await createAnchorBatch(["cred-dup"], ["dd".repeat(32)]);

    expect(second.batchId).toBe(first.batchId);
  });

  it("throws conflict for anchor requests that reuse credential in another root", async () => {
    await createAnchorBatch(["cred-conflict"], ["ee".repeat(32)]);

    await expect(
      createAnchorBatch(["cred-conflict"], ["ff".repeat(32)]),
    ).rejects.toMatchObject({
      name: "AnchorBatchError",
      code: "ANCHOR_BATCH_CONFLICT",
      status: 409,
    } satisfies Partial<AnchorBatchError>);
  });
});
