import { ethers } from 'ethers';
import {
    getChainRuntimeConfig,
    getChainWritePolicy,
    resolveChainNetwork,
    resolveChainRpcUrl,
    type SupportedChainNetwork,
} from '@credverse/shared-auth';
import { deterministicHash } from './proof-lifecycle';

// CredVerseRegistry ABI (aligned with contracts/contracts/CredVerseRegistry.sol)
// Keep this intentionally minimal (only what our services call).
const REGISTRY_ABI = [
    "function anchorCredential(bytes32 _rootHash) external",
    "function revokeCredential(bytes32 _credentialHash) external",
    "function adminRevokeCredential(bytes32 _credentialHash) external",
    "function isRevoked(bytes32 _credentialHash) external view returns (bool)",
    "function anchorExists(bytes32 _rootHash) external view returns (bool)",
    "function isActiveIssuer(address _issuerAddress) external view returns (bool)",
    "event AnchorSubmitted(bytes32 indexed rootHash, address indexed submitter, uint256 timestamp)",
    "event CredentialRevoked(bytes32 indexed credentialHash, address indexed revoker, uint256 timestamp)",
];

const DEFAULT_CONTRACT = process.env.REGISTRY_CONTRACT_ADDRESS || '';

export interface BlockchainConfig {
    rpcUrl?: string;
    contractAddress?: string;
    privateKey?: string;
    chainNetwork?: SupportedChainNetwork;
}

export interface AnchorResult {
    success: boolean;
    txHash?: string;
    blockNumber?: number;
    hash: string;
    error?: string;
    code?: 'BLOCKCHAIN_WRITES_DISABLED' | 'BLOCKCHAIN_DEFERRED_MODE';
    deferred?: boolean;
}

export interface VerifyResult {
    exists: boolean;
    isValid: boolean;
    issuer?: string;
    anchoredAt?: number;
    isRevoked?: boolean;
    revocationReason?: string;
}

/**
 * Blockchain Service for credential anchoring and verification
 */
export class BlockchainService {
    private provider: ethers.JsonRpcProvider;
    private contract: ethers.Contract;
    private signer?: ethers.Wallet;
    private isConfigured: boolean = false;
    private chain: SupportedChainNetwork;
    private writesAllowed: boolean = true;
    private writePolicyReason?: string;

    constructor(config?: Partial<BlockchainConfig>) {
        this.chain = resolveChainNetwork(config?.chainNetwork);
        const chainConfig = getChainRuntimeConfig(this.chain);
        const rpcUrl = resolveChainRpcUrl(this.chain, process.env, config?.rpcUrl);
        const writePolicy = getChainWritePolicy(this.chain);
        const contractAddress = config?.contractAddress || DEFAULT_CONTRACT;
        const privateKey = config?.privateKey || process.env.RELAYER_PRIVATE_KEY;
        this.writesAllowed = writePolicy.allowWrites;
        this.writePolicyReason = writePolicy.reason;

        if (!writePolicy.allowWrites) {
            console.warn(`[Blockchain] Writes disabled for ${this.chain}: ${writePolicy.reason}`);
        }

        this.provider = new ethers.JsonRpcProvider(rpcUrl, {
            chainId: chainConfig.chainId,
            name: chainConfig.networkName,
        });

        if (contractAddress && contractAddress.startsWith('0x')) {
            if (privateKey) {
                this.signer = new ethers.Wallet(privateKey, this.provider);
                this.contract = new ethers.Contract(contractAddress, REGISTRY_ABI, this.signer);
            } else {
                this.contract = new ethers.Contract(contractAddress, REGISTRY_ABI, this.provider);
            }
            // Don't set isConfigured here - validate contract first
            console.log(`[Blockchain] Attempting to configure with ${contractAddress} on ${this.chain} (${rpcUrl})`);

            // Async validation - check if contract is actually deployed
            this.validateContract(contractAddress, rpcUrl).catch(() => { });
        } else {
            // Create a dummy contract for development
            this.contract = new ethers.Contract(ethers.ZeroAddress, REGISTRY_ABI, this.provider);
            console.log(`[Blockchain] Running in deferred mode on ${this.chain} (no contract configuration)`);
        }
    }

    /**
     * Validate that the contract is actually deployed
     */
    private async validateContract(address: string, rpcUrl: string): Promise<void> {
        try {
            const code = await this.provider.getCode(address);
            if (code === '0x' || code === '') {
                console.log(`[Blockchain] Contract NOT deployed at ${address} on ${this.chain} - deferred mode active`);
                this.isConfigured = false;
            } else {
                console.log(`[Blockchain] Contract verified at ${address} on ${this.chain} (${rpcUrl})`);
                this.isConfigured = true;
            }
        } catch (error: any) {
            console.log(`[Blockchain] RPC unreachable (${error.message}) on ${this.chain} - deferred mode active`);
            this.isConfigured = false;
        }
    }

    /**
     * Hash credential data for on-chain storage
     */
    hashCredential(data: any): string {
        return deterministicHash(data, 'keccak256', 'RFC8785-V1');
    }

    /**
     * Anchor a credential hash on-chain
     */
    async anchorCredential(credentialData: any): Promise<AnchorResult> {
        const hash = this.hashCredential(credentialData);

        if (!this.writesAllowed) {
            return {
                success: false,
                hash,
                error: `Writes disabled by policy for ${this.chain}`,
                code: 'BLOCKCHAIN_WRITES_DISABLED',
                deferred: false,
            };
        }

        if (!this.signer) {
            return {
                success: false,
                hash,
                error: `Blockchain anchoring is running in deferred mode on ${this.chain}`,
                code: 'BLOCKCHAIN_DEFERRED_MODE',
                deferred: true,
            };
        }

        // One-shot contract validation for demo/runtime correctness.
        // init() validation is async; the first write can race it.
        if (!this.isConfigured) {
            try {
                const code = await this.provider.getCode(this.contract.target as string);
                this.isConfigured = !(code === '0x' || code === '');
            } catch {
                this.isConfigured = false;
            }
        }

        if (!this.isConfigured) {
            return {
                success: false,
                hash,
                error: `Blockchain anchoring is running in deferred mode on ${this.chain}`,
                code: 'BLOCKCHAIN_DEFERRED_MODE',
                deferred: true,
            };
        }

        try {
            const tx = await this.contract.anchorCredential(hash);
            const receipt = await tx.wait();

            console.log(`[Blockchain] Anchored credential: ${hash} in tx ${receipt.hash} on ${this.chain}`);

            return {
                success: true,
                txHash: receipt.hash,
                blockNumber: receipt.blockNumber,
                hash,
            };
        } catch (error: any) {
            console.error('[Blockchain] Anchor error:', error.message);
            return {
                success: false,
                hash,
                error: error.message,
            };
        }
    }

    /**
     * Revoke a credential on-chain
     */
    async revokeCredential(credentialHash: string, reason: string): Promise<AnchorResult> {
        if (!this.writesAllowed) {
            return {
                success: false,
                hash: credentialHash,
                error: `Writes disabled by policy for ${this.chain}`,
                code: 'BLOCKCHAIN_WRITES_DISABLED',
                deferred: false,
            };
        }

        if (!this.signer) {
            return {
                success: false,
                hash: credentialHash,
                error: `Blockchain revocation is running in deferred mode on ${this.chain}`,
                code: 'BLOCKCHAIN_DEFERRED_MODE',
                deferred: true,
            };
        }

        if (!this.isConfigured) {
            try {
                const code = await this.provider.getCode(this.contract.target as string);
                this.isConfigured = !(code === '0x' || code === '');
            } catch {
                this.isConfigured = false;
            }
        }

        if (!this.isConfigured) {
            return {
                success: false,
                hash: credentialHash,
                error: `Blockchain revocation is running in deferred mode on ${this.chain}`,
                code: 'BLOCKCHAIN_DEFERRED_MODE',
                deferred: true,
            };
        }

        try {
            // Contract does not store reason on-chain (we keep reason off-chain in evidence)
            const tx = await this.contract.revokeCredential(credentialHash);
            const receipt = await tx.wait();

            console.log(`[Blockchain] Revoked credential: ${credentialHash} in tx ${receipt.hash} on ${this.chain}`);

            return {
                success: true,
                txHash: receipt.hash,
                blockNumber: receipt.blockNumber,
                hash: credentialHash,
            };
        } catch (error: any) {
            console.error('[Blockchain] Revoke error:', error.message);
            return {
                success: false,
                hash: credentialHash,
                error: error.message,
            };
        }
    }

    /**
     * Verify a credential on-chain
     */
    async verifyCredential(credentialHash: string): Promise<VerifyResult> {
        if (!this.isConfigured) {
            return {
                exists: false,
                isValid: false,
            };
        }

        try {
            const exists = await this.contract.anchorExists(credentialHash);
            if (!exists) {
                return { exists: false, isValid: false };
            }

            const isRevoked = await this.contract.isRevoked(credentialHash);

            return {
                exists: true,
                isValid: !isRevoked,
                isRevoked,
            };
        } catch (error: any) {
            console.error('[Blockchain] Verify error:', error.message);
            return { exists: false, isValid: false };
        }
    }

    /**
     * Get full credential details from chain
     */
    async getCredentialDetails(credentialHash: string): Promise<any> {
        if (!this.isConfigured) {
            return { exists: false };
        }

        try {
            const exists = await this.contract.anchorExists(credentialHash);
            if (!exists) {
                return { exists: false };
            }
            const isRevoked = await this.contract.isRevoked(credentialHash);
            return {
                exists: true,
                isRevoked,
            };
        } catch {
            return { exists: false };
        }
    }

    /**
     * Get registry statistics
     * NOTE: the on-chain contract does not expose counts; return zeros for now.
     */
    async getStats(): Promise<{ anchored: number; revoked: number }> {
        return { anchored: 0, revoked: 0 };
    }

    /**
     * Check if blockchain is properly configured
     */
    isBlockchainConfigured(): boolean {
        return this.isConfigured;
    }

    getRuntimeStatus(): {
        chainNetwork: SupportedChainNetwork;
        writesAllowed: boolean;
        writePolicyReason?: string;
        configured: boolean;
        chainId: number;
        networkName: string;
    } {
        const chainConfig = getChainRuntimeConfig(this.chain);
        return {
            chainNetwork: this.chain,
            writesAllowed: this.writesAllowed,
            writePolicyReason: this.writePolicyReason,
            configured: this.isConfigured,
            chainId: chainConfig.chainId,
            networkName: chainConfig.networkName,
        };
    }

    /**
     * Get current network info
     */
    async getNetworkInfo(): Promise<{ chainId: number; name: string }> {
        try {
            const network = await this.provider.getNetwork();
            return {
                chainId: Number(network.chainId),
                name: network.name,
            };
        } catch {
            const chainConfig = getChainRuntimeConfig(this.chain);
            return { chainId: chainConfig.chainId, name: chainConfig.networkName };
        }
    }
}

// Singleton instance
export const blockchainService = new BlockchainService();
