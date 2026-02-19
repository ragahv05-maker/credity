import crypto from 'crypto';
import { deterministicHash } from './proof-lifecycle';

const PROOF_REPLAY_TTL_MS = Number(process.env.PROOF_REPLAY_TTL_MS || 10 * 60 * 1000);

class ProofReplayService {
    private proofReplayCache = new Map<string, number>();

    constructor() {
        // Optional: periodic cleanup
        setInterval(() => this.pruneProofReplayCache(), 60 * 1000).unref();
    }

    private pruneProofReplayCache(): void {
        const now = Date.now();
        for (const [key, expiresAt] of this.proofReplayCache.entries()) {
            if (expiresAt <= now) {
                this.proofReplayCache.delete(key);
            }
        }
    }

    markProofReplayFingerprint(fingerprint: string): boolean {
        this.pruneProofReplayCache();
        if (this.proofReplayCache.has(fingerprint)) {
            return false;
        }
        this.proofReplayCache.set(fingerprint, Date.now() + PROOF_REPLAY_TTL_MS);
        return true;
    }

    deriveProofReplayFingerprint(input: {
        format: string;
        proof: string | Record<string, unknown>;
        challenge?: string;
        domain?: string;
    }): string {
        const proofDigest =
            typeof input.proof === 'string'
                ? crypto.createHash('sha256').update(input.proof).digest('hex')
                : deterministicHash(input.proof, 'sha256');
        return `${input.format}:${input.challenge || ''}:${input.domain || ''}:${proofDigest}`;
    }
}

export const proofReplayService = new ProofReplayService();
