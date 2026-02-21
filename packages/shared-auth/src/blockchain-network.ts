export type SupportedChainNetwork =
  | "ethereum-sepolia"
  | "polygon-mainnet"
  | "polygon-amoy"
  | "polygon-zkevm-mainnet"
  | "polygon-zkevm-cardona";

export interface ChainRuntimeConfig {
  chainId: number;
  networkName: string;
  rpcEnvs: string[];
  publicFallbackRpc: string;
}

const CHAIN_ALIASES: Record<string, SupportedChainNetwork> = {
  "ethereum-sepolia": "ethereum-sepolia",
  sepolia: "ethereum-sepolia",
  "polygon-mainnet": "polygon-mainnet",
  polygon: "polygon-mainnet",
  mainnet: "polygon-mainnet",
  "polygon-amoy": "polygon-amoy",
  amoy: "polygon-amoy",
  "polygon-zkevm-mainnet": "polygon-zkevm-mainnet",
  "zkevm-mainnet": "polygon-zkevm-mainnet",
  zkevm: "polygon-zkevm-mainnet",
  "polygon-zkevm-cardona": "polygon-zkevm-cardona",
  "zkevm-cardona": "polygon-zkevm-cardona",
  cardona: "polygon-zkevm-cardona",
};

const CHAIN_CONFIG: Record<SupportedChainNetwork, ChainRuntimeConfig> = {
  "ethereum-sepolia": {
    chainId: 11155111,
    networkName: "sepolia",
    rpcEnvs: ["RPC_URL", "CHAIN_RPC_URL", "SEPOLIA_RPC_URL"],
    publicFallbackRpc: "https://rpc.sepolia.org",
  },
  "polygon-mainnet": {
    chainId: 137,
    networkName: "polygon",
    rpcEnvs: ["RPC_URL", "CHAIN_RPC_URL", "POLYGON_RPC_URL"],
    publicFallbackRpc: "https://polygon-rpc.com",
  },
  "polygon-amoy": {
    chainId: 80002,
    networkName: "polygon-amoy",
    rpcEnvs: ["RPC_URL", "CHAIN_RPC_URL", "POLYGON_AMOY_RPC_URL"],
    publicFallbackRpc: "https://rpc-amoy.polygon.technology",
  },
  "polygon-zkevm-mainnet": {
    chainId: 1101,
    networkName: "polygon-zkevm",
    rpcEnvs: ["RPC_URL", "CHAIN_RPC_URL", "POLYGON_ZKEVM_RPC_URL"],
    publicFallbackRpc: "https://zkevm-rpc.com",
  },
  "polygon-zkevm-cardona": {
    chainId: 2442,
    networkName: "polygon-zkevm-cardona",
    rpcEnvs: [
      "RPC_URL",
      "CHAIN_RPC_URL",
      "POLYGON_ZKEVM_CARDONA_RPC_URL",
      "POLYGON_ZKEVM_TESTNET_RPC_URL",
    ],
    publicFallbackRpc: "https://rpc.cardona.zkevm-rpc.com",
  },
};

function envIsTrue(value: string | undefined): boolean {
  return value?.toLowerCase() === "true";
}

export function resolveChainNetwork(requested?: string): SupportedChainNetwork {
  const raw = (
    requested ||
    process.env.CHAIN_NETWORK ||
    "ethereum-sepolia"
  ).toLowerCase();
  return CHAIN_ALIASES[raw] ?? "ethereum-sepolia";
}

export function getChainRuntimeConfig(
  network: SupportedChainNetwork,
): ChainRuntimeConfig {
  return CHAIN_CONFIG[network];
}

export function resolveChainRpcUrl(
  network: SupportedChainNetwork,
  env: NodeJS.ProcessEnv = process.env,
  explicitRpcUrl?: string,
): string {
  if (explicitRpcUrl) {
    return explicitRpcUrl;
  }
  const configured = CHAIN_CONFIG[network].rpcEnvs
    .map((key) => env[key])
    .find(Boolean);
  return configured || CHAIN_CONFIG[network].publicFallbackRpc;
}

export function getChainWritePolicy(
  network: SupportedChainNetwork,
  env: NodeJS.ProcessEnv = process.env,
): { allowWrites: boolean; reason?: string } {
  if (
    network === "polygon-zkevm-mainnet" &&
    !envIsTrue(env.ENABLE_ZKEVM_MAINNET)
  ) {
    return {
      allowWrites: false,
      reason: "ENABLE_ZKEVM_MAINNET is not set to true",
    };
  }
  return { allowWrites: true };
}
