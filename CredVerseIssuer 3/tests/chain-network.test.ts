import { describe, expect, it } from "vitest";
import {
  getChainWritePolicy,
  resolveChainNetwork,
  resolveChainRpcUrl,
} from "@credverse/shared-auth";

describe("blockchain network policy", () => {
  it("resolves chain aliases consistently", () => {
    expect(resolveChainNetwork("sepolia")).toBe("ethereum-sepolia");
    expect(resolveChainNetwork("polygon")).toBe("polygon-mainnet");
    expect(resolveChainNetwork("cardona")).toBe("polygon-zkevm-cardona");
    expect(resolveChainNetwork("zkevm-mainnet")).toBe("polygon-zkevm-mainnet");
  });

  it("defaults to ethereum sepolia for unknown networks", () => {
    expect(resolveChainNetwork("unknown-chain")).toBe("ethereum-sepolia");
  });

  it("resolves rpc url from env list with fallback", () => {
    const env = {
      POLYGON_ZKEVM_CARDONA_RPC_URL: "https://cardona.example-rpc",
    } as NodeJS.ProcessEnv;

    expect(resolveChainRpcUrl("polygon-zkevm-cardona", env)).toBe(
      "https://cardona.example-rpc",
    );
    expect(resolveChainRpcUrl("polygon-mainnet", {} as NodeJS.ProcessEnv)).toBe(
      "https://polygon-rpc.com",
    );
  });

  it("blocks zkEVM mainnet writes unless explicitly enabled", () => {
    const disabled = getChainWritePolicy(
      "polygon-zkevm-mainnet",
      {} as NodeJS.ProcessEnv,
    );
    expect(disabled.allowWrites).toBe(false);

    const enabled = getChainWritePolicy("polygon-zkevm-mainnet", {
      ENABLE_ZKEVM_MAINNET: "true",
    } as NodeJS.ProcessEnv);
    expect(enabled.allowWrites).toBe(true);
  });

  it("keeps non-zkevm-mainnet write paths enabled by default", () => {
    expect(getChainWritePolicy("ethereum-sepolia").allowWrites).toBe(true);
    expect(getChainWritePolicy("polygon-zkevm-cardona").allowWrites).toBe(true);
  });
});
