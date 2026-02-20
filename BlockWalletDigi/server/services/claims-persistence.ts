import { PostgresStateStore } from '@credverse/shared-auth';
import type { ClaimVerifyRequest, ClaimVerifyResponse } from './claims-service';

interface PersistedStateStore<T> {
  load(): Promise<T | null>;
  save(state: T): Promise<void>;
}

export interface StoredClaimRecord {
  id: string;
  claimantUserId: string;
  platformId: string | null;
  claimType: ClaimVerifyRequest['claimType'];
  claimAmount: number | null;
  description: string;
  timeline: ClaimVerifyRequest['timeline'];
  evidenceIds: string[];
  // Stored in API response shape (snake_case) for now.
  evidenceLinks?: Array<Record<string, unknown>>;
  identityScore: number;
  integrityScore: number;
  authenticityScore: number;
  trustScore: number;
  recommendation: ClaimVerifyResponse['recommendation'];
  /** Reviewer-set status that overrides the AI recommendation. */
  status?: 'approved' | 'rejected' | 'needs_review';
  reviewedBy?: string;
  reviewNote?: string;
  reviewedAt?: string;
  redFlags: string[];
  reasonCodes?: ClaimVerifyResponse['reasonCodes'];
  riskSignals?: ClaimVerifyResponse['riskSignals'];
  aiAnalysis: ClaimVerifyResponse['aiAnalysis'];
  processingTimeMs: number;
  createdAt: string;
  processedAt: string;
}

export interface StoredEvidenceRecord {
  id: string;
  userId: string;
  claimId: string | null;
  mediaType: 'image' | 'video' | 'document';
  storageUrl: string;
  authenticityScore: number;
  isAiGenerated: boolean;
  manipulationDetected: boolean;
  metadata: Record<string, unknown>;
  blockchainHash: string;
  proofMetadataHash?: string;
  revocationCheck?: { status: 'not_applicable' | 'checked'; revoked?: boolean; checkedAt?: string; provider?: string };
  anchorTx?: { status: 'missing' | 'pending' | 'confirmed' | 'failed'; chain?: string; txHash?: string };
  analysisData: Record<string, unknown>;
  uploadedAt: string;
  analyzedAt: string;
}

interface ClaimsPersistenceState {
  claims: StoredClaimRecord[];
  evidence: StoredEvidenceRecord[];
}

const emptyState: ClaimsPersistenceState = { claims: [], evidence: [] };

export class ClaimsPersistence {
  private state = emptyState;
  private hydrated = false;
  private hydrationPromise: Promise<void> | null = null;
  private persistChain = Promise.resolve();

  constructor(private readonly store?: PersistedStateStore<ClaimsPersistenceState>) {}

  private async ensureHydrated(): Promise<void> {
    if (!this.store || this.hydrated) return;
    if (!this.hydrationPromise) {
      this.hydrationPromise = (async () => {
        const loaded = await this.store!.load();
        this.state = loaded ?? { ...emptyState };
        if (!loaded) await this.store!.save(this.state);
        this.hydrated = true;
      })();
    }
    await this.hydrationPromise;
  }

  private async persist(): Promise<void> {
    if (!this.store) return;
    this.persistChain = this.persistChain
      .then(() => this.store!.save(this.state))
      .catch((error) => {
        console.error('[ClaimsPersistence] Failed to save state:', error);
      });
    await this.persistChain;
  }

  async saveClaim(record: StoredClaimRecord): Promise<void> {
    await this.ensureHydrated();
    this.state.claims = this.state.claims.filter((c) => c.id !== record.id);
    this.state.claims.push(record);
    await this.persist();
  }

  async getClaim(id: string): Promise<StoredClaimRecord | undefined> {
    await this.ensureHydrated();
    return this.state.claims.find((c) => c.id === id);
  }

  async listClaims(platformId?: string): Promise<StoredClaimRecord[]> {
    await this.ensureHydrated();
    const filtered = platformId
      ? this.state.claims.filter((c) => c.platformId === platformId)
      : this.state.claims;
    return [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async saveEvidence(record: StoredEvidenceRecord): Promise<void> {
    await this.ensureHydrated();
    this.state.evidence = this.state.evidence.filter((e) => e.id !== record.id);
    this.state.evidence.push(record);

    if (record.claimId) {
      const claim = this.state.claims.find((c) => c.id === record.claimId);
      if (claim && !claim.evidenceIds.includes(record.id)) {
        claim.evidenceIds.push(record.id);
      }
    }

    await this.persist();
  }

  async getEvidence(id: string): Promise<StoredEvidenceRecord | undefined> {
    await this.ensureHydrated();
    return this.state.evidence.find((e) => e.id === id);
  }

  async listClaimsForUser(userId: string): Promise<StoredClaimRecord[]> {
    await this.ensureHydrated();
    return this.state.claims
      .filter((c) => c.claimantUserId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async updateClaimStatus(
    claimId: string,
    status: 'approved' | 'rejected' | 'needs_review',
    reviewedBy?: string,
    reviewNote?: string,
  ): Promise<StoredClaimRecord | undefined> {
    await this.ensureHydrated();
    const claim = this.state.claims.find((c) => c.id === claimId);
    if (!claim) return undefined;
    claim.status = status;
    claim.reviewedBy = reviewedBy;
    claim.reviewNote = reviewNote;
    claim.reviewedAt = new Date().toISOString();
    await this.persist();
    return claim;
  }

  async resetForTests(): Promise<void> {
    this.state = { claims: [], evidence: [] };
    this.hydrated = true;
    await this.persist();
  }
}

function createPersistedStateStore(dbUrl?: string): PersistedStateStore<ClaimsPersistenceState> | undefined {
  if (!dbUrl) return undefined;
  return new PostgresStateStore<ClaimsPersistenceState>({
    databaseUrl: dbUrl,
    serviceKey: 'claims-persistence-v1',
  });
}

export function createClaimsPersistence(store?: PersistedStateStore<ClaimsPersistenceState>): ClaimsPersistence {
  if (store) return new ClaimsPersistence(store);
  return new ClaimsPersistence(createPersistedStateStore(process.env.DATABASE_URL));
}

export const claimsPersistence = createClaimsPersistence();
