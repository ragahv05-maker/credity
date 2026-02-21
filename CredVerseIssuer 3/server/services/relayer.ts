import {
  createWalletClient,
  http,
  publicActions,
  type WalletClient,
  type PublicClient,
  type Account,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  polygon,
  polygonAmoy,
  polygonZkEvm,
  polygonZkEvmCardona,
  sepolia,
  type Chain,
} from "viem/chains";
import {
  getChainWritePolicy,
  resolveChainNetwork,
  resolveChainRpcUrl,
  type SupportedChainNetwork,
} from "@credverse/shared-auth";

// ABI for CredentialRegistry (simplified for MVP)
const REGISTRY_ABI = [
  {
    inputs: [{ name: "_rootHash", type: "bytes32" }],
    name: "anchorCredential",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "_credentialHash", type: "bytes32" }],
    name: "revokeCredential",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "_credentialHash", type: "bytes32" }],
    name: "isRevoked",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const VIEM_CHAIN_CONFIG: Record<SupportedChainNetwork, Chain> = {
  "ethereum-sepolia": sepolia,
  "polygon-mainnet": polygon,
  "polygon-amoy": polygonAmoy,
  "polygon-zkevm-mainnet": polygonZkEvm,
  "polygon-zkevm-cardona": polygonZkEvmCardona,
};

export class RelayerService {
  private client?: WalletClient & PublicClient;
  private account?: Account;
  private contractAddress?: `0x${string}`;
  private chain?: Chain;
  private network?: SupportedChainNetwork;

  constructor() {
    const privateKey = process.env.RELAYER_PRIVATE_KEY as
      | `0x${string}`
      | undefined;
    const contractAddress = process.env.REGISTRY_CONTRACT_ADDRESS as
      | `0x${string}`
      | undefined;
    const network = resolveChainNetwork();
    const rpcUrl = resolveChainRpcUrl(network);
    const policy = getChainWritePolicy(network);

    if (!policy.allowWrites) {
      console.warn(
        `[Relayer] Writes disabled for ${network}: ${policy.reason}`,
      );
      return;
    }

    if (!privateKey || !contractAddress || !rpcUrl) {
      console.warn(
        `[Relayer] Not fully configured for ${network}. Write operations will be unavailable.`,
      );
      return;
    }

    this.account = privateKeyToAccount(privateKey);
    this.contractAddress = contractAddress;
    this.chain = VIEM_CHAIN_CONFIG[network];
    this.network = network;
    this.client = createWalletClient({
      account: this.account,
      chain: this.chain,
      transport: http(rpcUrl),
    }).extend(publicActions) as any;

    console.log(
      `[Relayer] Configured for ${network} (chainId=${this.chain.id})`,
    );
  }

  async anchorCredential(credentialHash: string): Promise<string> {
    try {
      if (
        !this.client ||
        !this.account ||
        !this.contractAddress ||
        !this.chain
      ) {
        throw new Error("Relayer is not configured");
      }

      const hash = await this.client.writeContract({
        address: this.contractAddress,
        abi: REGISTRY_ABI,
        functionName: "anchorCredential",
        args: [credentialHash as `0x${string}`],
        account: this.account,
        chain: this.chain,
      });

      console.log(
        `Anchored credential ${credentialHash} in tx ${hash} on ${this.network}`,
      );
      return hash;
    } catch (error) {
      console.error("Failed to anchor credential:", error);
      throw new Error("Blockchain anchoring failed");
    }
  }

  async revokeCredential(credentialHash: string): Promise<string> {
    try {
      if (
        !this.client ||
        !this.account ||
        !this.contractAddress ||
        !this.chain
      ) {
        throw new Error("Relayer is not configured");
      }

      const hash = await this.client.writeContract({
        address: this.contractAddress,
        abi: REGISTRY_ABI,
        functionName: "revokeCredential",
        args: [credentialHash as `0x${string}`],
        account: this.account,
        chain: this.chain,
      });

      console.log(
        `Revoked credential ${credentialHash} in tx ${hash} on ${this.network}`,
      );
      return hash;
    } catch (error) {
      console.error("Failed to revoke credential:", error);
      throw new Error("Blockchain revocation failed");
    }
  }

  async isRevoked(credentialHash: string): Promise<boolean | null> {
    try {
      if (!this.client || !this.contractAddress) {
        return null;
      }
      if (!/^0x[a-fA-F0-9]{64}$/.test(credentialHash)) {
        return null;
      }

      const isRevoked = await this.client.readContract({
        address: this.contractAddress,
        abi: REGISTRY_ABI,
        functionName: "isRevoked",
        args: [credentialHash as `0x${string}`],
      });

      return isRevoked;
    } catch (error) {
      console.error("Failed to check revocation status:", error);
      return null;
    }
  }
}

export const relayerService = new RelayerService();
