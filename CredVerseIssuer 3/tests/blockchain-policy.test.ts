import { afterEach, describe, expect, it } from "vitest";
import { BlockchainService } from "../server/services/blockchain-service";

const previousEnableZkevmMainnet = process.env.ENABLE_ZKEVM_MAINNET;

afterEach(() => {
  if (previousEnableZkevmMainnet === undefined) {
    delete process.env.ENABLE_ZKEVM_MAINNET;
  } else {
    process.env.ENABLE_ZKEVM_MAINNET = previousEnableZkevmMainnet;
  }
});

describe("blockchain write policy enforcement", () => {
  it("blocks writes on polygon-zkevm-mainnet unless explicitly enabled", async () => {
    delete process.env.ENABLE_ZKEVM_MAINNET;
    const service = new BlockchainService({
      chainNetwork: "polygon-zkevm-mainnet",
      contractAddress: "",
      rpcUrl: "http://127.0.0.1:8545",
    });

    const anchor = await service.anchorCredential({ id: "cred-1" });
    const revoke = await service.revokeCredential("0x1234", "policy-check");

    expect(anchor.success).toBe(false);
    expect(anchor.error).toContain("Writes disabled by policy");
    expect(anchor.code).toBe("BLOCKCHAIN_WRITES_DISABLED");
    expect(anchor.deferred).toBe(false);
    expect(revoke.success).toBe(false);
    expect(revoke.error).toContain("Writes disabled by policy");
    expect(revoke.code).toBe("BLOCKCHAIN_WRITES_DISABLED");
    expect(revoke.deferred).toBe(false);
  });

  it("keeps non-zkevm-mainnet networks writable by policy", async () => {
    const service = new BlockchainService({
      chainNetwork: "polygon-zkevm-cardona",
      contractAddress: "",
      rpcUrl: "http://127.0.0.1:8545",
    });

    const anchor = await service.anchorCredential({ id: "cred-2" });
    expect(anchor.success).toBe(false);
    expect(anchor.error).toContain("deferred mode");
    expect(anchor.code).toBe("BLOCKCHAIN_DEFERRED_MODE");
    expect(anchor.deferred).toBe(true);
  });
});
