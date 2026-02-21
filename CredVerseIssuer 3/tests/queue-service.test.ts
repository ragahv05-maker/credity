import { describe, expect, it } from "vitest";
import {
  getDeadLetterJobs,
  getQueueReliabilityConfig,
  isQueueAvailable,
  replayDeadLetterJob,
} from "../server/services/queue-service";

describe("queue service dead-letter helpers", () => {
  it("returns empty dead-letter list when queue is unavailable", async () => {
    expect(isQueueAvailable()).toBe(false);
    await expect(getDeadLetterJobs()).resolves.toEqual([]);
  });

  it("rejects replay when queue is unavailable", async () => {
    await expect(replayDeadLetterJob("missing-entry")).rejects.toThrow(
      "Queue service unavailable",
    );
  });

  it("exposes queue retry/backoff reliability config even when queue is unavailable", async () => {
    const reliability = await getQueueReliabilityConfig();

    expect(reliability.attempts).toBeGreaterThan(0);
    expect(reliability.backoff.type).toBe("exponential");
    expect(reliability.backoff.delayMs).toBeGreaterThan(0);
    expect(reliability.deadLetterQueueAvailable).toBe(false);
  });
});
