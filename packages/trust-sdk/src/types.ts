import type {
  ReputationCategoryContract,
  ReputationEventContract,
  ReputationProfileContract,
  ReputationScoreContract,
  SafeDateScoreContract,
  CandidateVerificationSummary,
  VerificationEvidence,
  ProofGenerationRequestContract,
  ProofGenerationResultContract,
  ProofVerificationRequestContract,
  ProofVerificationResultContract,
  RevocationWitnessContract,
} from '@credverse/shared-auth';

export type TrustVertical =
  | 'OVERALL'
  | 'DATING'
  | 'HIRING'
  | 'GIG'
  | 'RENTAL'
  | 'HEALTH'
  | 'EDUCATION'
  | 'FINANCE'
  | 'IDENTITY';

export type VerifyDecision = 'APPROVE' | 'REVIEW' | 'REJECT';

export interface CredVerseClientOptions {
  baseUrl: string;
  apiKey?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export interface VerifyRequest {
  userId?: number;
  subjectDid?: string;
  vertical: TrustVertical;
  requiredScore?: number;
  includeZkProof?: boolean;
}

export interface VerifyResult {
  vertical: TrustVertical;
  score: number;
  recommendation: VerifyDecision;
  requiredScore: number;
  normalizedScore: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  zkProof: ProofGenerationResultWithCode | null;
  raw: ReputationScoreContract | SafeDateScoreContract;
}

export interface IngestReputationEventRequest {
  eventId?: string;
  userId?: number;
  subjectDid?: string;
  platformId: string;
  category: ReputationCategoryContract;
  signalType: string;
  score: number;
  occurredAt?: string;
  metadata?: Record<string, unknown>;
}

export interface ReputationShareGrantRequest {
  subjectDid: string;
  granteeId: string;
  purpose: string;
  dataElements?: string[];
  expiresAt: string;
}

export interface ProofGenerationResultWithCode extends ProofGenerationResultContract {
  code?: string;
}

export interface ProofVerificationResultWithCode extends ProofVerificationResultContract {
  code?: string;
}

export interface ProofMetadataRequest {
  credential: Record<string, unknown>;
  hashAlgorithm?: string;
  canonicalization?: string;
}

export interface ProofMetadataResult {
  hash: string;
  hash_algorithm: string;
  canonicalization: string;
  proof_version: string;
  checked_at: string;
  code?: string;
}

export type {
  ProofGenerationRequestContract,
  ProofGenerationResultContract,
  ProofVerificationRequestContract,
  ProofVerificationResultContract,
  RevocationWitnessContract,
  ReputationCategoryContract,
  ReputationEventContract,
  ReputationProfileContract,
  ReputationScoreContract,
  SafeDateScoreContract,
  CandidateVerificationSummary,
  VerificationEvidence,
};
