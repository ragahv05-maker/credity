import type {
  CredVerseClientOptions,
  IngestReputationEventRequest,
  ProofGenerationRequestContract,
  ProofGenerationResultWithCode,
  ProofMetadataRequest,
  ProofMetadataResult,
  ProofVerificationRequestContract,
  ProofVerificationResultWithCode,
  ReputationProfileContract,
  ReputationScoreContract,
  ReputationShareGrantRequest,
  RevocationWitnessContract,
  SafeDateScoreContract,
  TrustVertical,
  VerifyDecision,
  VerifyRequest,
  VerifyResult,
  CandidateVerificationSummary,
} from './types.js';

const DEFAULT_TIMEOUT_MS = 10_000;

const VERTICAL_MAP: Record<TrustVertical, string> = {
  OVERALL: 'overall',
  DATING: 'safe_date',
  HIRING: 'work',
  GIG: 'gig',
  RENTAL: 'rental',
  HEALTH: 'health',
  EDUCATION: 'education',
  FINANCE: 'finance',
  IDENTITY: 'identity',
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function deriveDecision(score: number, requiredScore: number): VerifyDecision {
  if (score >= requiredScore) return 'APPROVE';
  if (score >= Math.max(50, requiredScore - 15)) return 'REVIEW';
  return 'REJECT';
}

function deriveConfidence(normalizedScore: number): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (normalizedScore >= 85) return 'HIGH';
  if (normalizedScore >= 65) return 'MEDIUM';
  return 'LOW';
}

function normalizeIdentity(subjectDid?: string, userId?: number): string {
  if (subjectDid && subjectDid.trim().length > 0) return subjectDid;
  if (typeof userId === 'number' && Number.isFinite(userId) && userId > 0) return String(Math.floor(userId));
  throw new Error('Either subjectDid or userId is required');
}

export class CredVerse {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: CredVerseClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.apiKey = options.apiKey;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async verify(input: VerifyRequest): Promise<VerifyResult> {
    const requiredScore = clamp(Math.round(input.requiredScore ?? 70), 0, 100);
    const subjectDid = input.subjectDid ?? (input.userId ? String(input.userId) : undefined);

    if (input.vertical === 'DATING') {
      const safeDate = await this.getSafeDateScore({ userId: input.userId, subjectDid: input.subjectDid });
      const normalizedScore = clamp(Math.round(safeDate.score), 0, 100);
      let zkProof: ProofGenerationResultWithCode | null = null;
      if (input.includeZkProof) {
        try {
          zkProof = await this.generateProof({
            format: 'sd-jwt-vc',
            subject_did: subjectDid,
            proof_purpose: 'assertionMethod',
            metadata: { vertical: 'safe_date', score: normalizedScore },
          });
        } catch {
          zkProof = null;
        }
      }
      return {
        vertical: input.vertical,
        score: normalizedScore,
        normalizedScore,
        requiredScore,
        recommendation: deriveDecision(normalizedScore, requiredScore),
        confidence: deriveConfidence(normalizedScore),
        zkProof,
        raw: safeDate,
      };
    }

    const reputation = await this.getReputationScore({
      userId: input.userId,
      subjectDid: input.subjectDid,
      vertical: input.vertical,
    });

    const normalizedScore = clamp(Math.round((reputation.score / 1000) * 100), 0, 100);
    let zkProof: ProofGenerationResultWithCode | null = null;
    if (input.includeZkProof) {
      try {
        zkProof = await this.generateProof({
          format: 'sd-jwt-vc',
          subject_did: subjectDid,
          proof_purpose: 'assertionMethod',
          metadata: { vertical: input.vertical, score: normalizedScore },
        });
      } catch {
        zkProof = null;
      }
    }
    return {
      vertical: input.vertical,
      score: normalizedScore,
      normalizedScore,
      requiredScore,
      recommendation: deriveDecision(normalizedScore, requiredScore),
      confidence: deriveConfidence(normalizedScore),
      zkProof,
      raw: reputation,
    };
  }

  async ingestReputationEvent(payload: IngestReputationEventRequest): Promise<{ success: true; event: unknown }> {
    const subjectDid = normalizeIdentity(payload.subjectDid, payload.userId);
    const body = {
      event_id: payload.eventId,
      user_id: payload.userId,
      subject_did: subjectDid,
      platform_id: payload.platformId,
      category: payload.category,
      signal_type: payload.signalType,
      score: payload.score,
      occurred_at: payload.occurredAt,
      metadata: payload.metadata,
    };

    return this.request('/v1/reputation/events', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getReputationScore(params: {
    userId?: number;
    subjectDid?: string;
    vertical?: TrustVertical;
  }): Promise<ReputationScoreContract> {
    const subjectDid = normalizeIdentity(params.subjectDid, params.userId);
    const vertical = params.vertical ? VERTICAL_MAP[params.vertical] : VERTICAL_MAP.OVERALL;
    const search = new URLSearchParams({ subjectDid, vertical });
    if (params.userId) search.set('userId', String(params.userId));

    const response = await this.request<{ success: boolean; reputation: ReputationScoreContract }>(
      `/v1/reputation/score?${search.toString()}`,
    );

    return response.reputation;
  }

  async getSafeDateScore(params: { userId?: number; subjectDid?: string }): Promise<SafeDateScoreContract> {
    const subjectDid = normalizeIdentity(params.subjectDid, params.userId);
    const search = new URLSearchParams({ subjectDid });
    if (params.userId) search.set('userId', String(params.userId));

    const response = await this.request<{ success: boolean; safe_date: SafeDateScoreContract }>(
      `/v1/reputation/safedate?${search.toString()}`,
    );

    return response.safe_date;
  }

  async getVerificationSummary(params: { userId?: number; subjectDid?: string }): Promise<CandidateVerificationSummary> {
    const subjectDid = normalizeIdentity(params.subjectDid, params.userId);
    const search = new URLSearchParams({ subjectDid });
    if (params.userId) search.set('userId', String(params.userId));

    const response = await this.request<{ success: boolean; candidate_summary: CandidateVerificationSummary }>(
      `/v1/reputation/summary?${search.toString()}`,
    );

    return response.candidate_summary;
  }

  async getReputationProfile(subjectDid: string): Promise<ReputationProfileContract> {
    const response = await this.request<{ success: boolean; profile: ReputationProfileContract }>(
      `/v1/reputation/profiles/${encodeURIComponent(subjectDid)}`,
    );

    return response.profile;
  }

  async createShareGrant(payload: ReputationShareGrantRequest): Promise<{ success: true; grant: unknown }> {
    return this.request('/v1/reputation/share-grants', {
      method: 'POST',
      body: JSON.stringify({
        subject_did: payload.subjectDid,
        grantee_id: payload.granteeId,
        purpose: payload.purpose,
        data_elements: payload.dataElements ?? [],
        expires_at: payload.expiresAt,
      }),
    });
  }

  async revokeShareGrant(id: string): Promise<{ success: true; grant: unknown }> {
    return this.request(`/v1/reputation/share-grants/${encodeURIComponent(id)}/revoke`, {
      method: 'POST',
    });
  }

  async generateProof(payload: ProofGenerationRequestContract): Promise<ProofGenerationResultWithCode> {
    return this.request('/api/v1/proofs/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async verifyProof(payload: ProofVerificationRequestContract): Promise<ProofVerificationResultWithCode> {
    return this.request('/v1/proofs/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getProofMetadata(payload: ProofMetadataRequest): Promise<ProofMetadataResult> {
    return this.request('/v1/proofs/metadata', {
      method: 'POST',
      body: JSON.stringify({
        credential: payload.credential,
        hash_algorithm: payload.hashAlgorithm ?? 'sha256',
        canonicalization: payload.canonicalization ?? 'json-stable-v1',
      }),
    });
  }

  async getRevocationWitness(credentialId: string): Promise<RevocationWitnessContract> {
    return this.request(`/api/v1/proofs/revocation-witness/${encodeURIComponent(credentialId)}`);
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const headers = new Headers(init?.headers || {});
      headers.set('content-type', 'application/json');
      if (this.apiKey) headers.set('x-api-key', this.apiKey);

      const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        ...init,
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`CredVerse API error ${response.status}: ${errorText}`);
      }

      return response.json() as Promise<T>;
    } finally {
      clearTimeout(timeout);
    }
  }
}
