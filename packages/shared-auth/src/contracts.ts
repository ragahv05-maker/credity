export type CredentialFormat = "sd-jwt-vc" | "vc+jwt" | "vc+ldp";

export interface CredentialRecordContract {
  id: string;
  format: CredentialFormat;
  issuer_did: string;
  subject_did: string;
  status_list_id: string | null;
  status_list_index: number | null;
  anchor_batch_id: string | null;
  anchor_proof: Record<string, unknown> | null;
  holder_binding: Record<string, unknown> | null;
  issuance_flow: "oid4vci" | "legacy";
}

export interface VerificationResultContract {
  id: string;
  credential_validity: "valid" | "invalid" | "unknown";
  status_validity: "active" | "revoked" | "unknown";
  anchor_validity: "anchored" | "pending" | "missing" | "unknown";
  anchor_state?: "queued" | "submitted" | "confirmed" | "failed" | "pending";
  fraud_score: number;
  fraud_explanations: string[];
  decision: "approve" | "review" | "investigate" | "reject";
  decision_reason_codes: string[];
  checked_at?: string;
}

export interface TrustScoreSnapshotContract {
  id: string;
  user_id: string;
  score: number;
  signals_version: string;
  features_hash: string;
  model_version: string;
  explanation_json: Record<string, unknown>;
  decay_applied_at: string | null;
  created_at: string;
}

export interface ConsentGrantContract {
  id: string;
  subject_id: string;
  verifier_id: string;
  purpose: string;
  data_elements: string[];
  expiry: string;
  revocation_ts: string | null;
  consent_proof: Record<string, unknown>;
}

export type ReputationCategoryContract =
  | "transport"
  | "accommodation"
  | "delivery"
  | "employment"
  | "finance"
  | "social"
  | "identity";

export interface ReputationEventContract {
  id: string;
  event_id: string;
  user_id: number;
  platform_id: string;
  category: ReputationCategoryContract;
  signal_type: string;
  score: number; // 0-100
  occurred_at: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ReputationCategoryBreakdownContract {
  category: ReputationCategoryContract;
  weight: number;
  score: number;
  weighted_score: number;
  event_count: number;
}

export interface ReputationScoreContract {
  user_id: number;
  score: number; // 0-1000
  event_count: number;
  category_breakdown: ReputationCategoryBreakdownContract[];
  computed_at: string;
  subject_did?: string;
  vertical?: string;
}

export interface SafeDateScoreContract {
  user_id: number;
  score: number; // 0-100
  breakdown: {
    identity_verified_points: number;
    liveness_points: number;
    background_clean_points: number;
    cross_platform_reputation_points: number;
    social_validation_points: number;
    harassment_free_points: number;
  };
  computed_at: string;
  reason_codes: string[];
}

export interface ReputationProfileContract {
  subject_did: string;
  scores: ReputationScoreContract[];
  signals?: Record<string, unknown>;
  signals_version?: string;
  computed_at?: string;
}

export interface PlatformAuthorityContract {
  id: string;
  platform_id: string;
  tenant_id: string | null;
  name: string;
  domain: string | null;
  status: "pending" | "active" | "suspended";
  allowed_verticals: string[];
  allowed_categories: ReputationCategoryContract[];
  created_at: string;
}

export type ProofFormatContract =
  | "sd-jwt-vc"
  | "jwt_vp"
  | "ldp_vp"
  | "ldp_vc"
  | "merkle-membership";
export type ProofPurposeContract = "authentication" | "assertionMethod";

export interface ProofGenerationRequestContract {
  credential_id?: string;
  format: ProofFormatContract;
  proof_purpose?: ProofPurposeContract;
  challenge?: string;
  domain?: string;
  subject_did?: string;
  disclosure_frame?: Record<string, unknown>;
  nonce?: string;
  metadata?: Record<string, unknown>;
}

export interface MerkleMembershipProofContract {
  type: "credity.merkle-membership-proof/v1";
  verification_contract: "credity-proof-verification/v1";
  canonicalization: "RFC8785-V1";
  hash_algorithm: "sha256";
  issued_at: string;
  credential_id: string;
  issuer_did: string | null;
  subject_did: string | null;
  challenge: string | null;
  domain: string | null;
  nonce: string | null;
  claims_digest: string;
  leaf_hash: string;
  verification_endpoint: string;
  zk_hook?: Record<string, unknown> | null;
}

export interface ProofGenerationResultContract {
  id: string;
  status: "generated" | "queued" | "unsupported" | "failed";
  format: ProofFormatContract;
  proof:
    | MerkleMembershipProofContract
    | Record<string, unknown>
    | string
    | null;
  public_signals?: Record<string, unknown> | null;
  credential_id?: string | null;
  created_at: string;
  reason?: string;
}

export interface ProofVerificationRequestContract {
  format: ProofFormatContract;
  proof: MerkleMembershipProofContract | Record<string, unknown> | string;
  challenge?: string;
  domain?: string;
  expected_issuer_did?: string;
  expected_subject_did?: string;
  expected_claims?: Record<string, unknown>;
  revocation_witness?: RevocationWitnessContract;
}

export interface ProofVerificationResultContract {
  id: string;
  valid: boolean;
  decision: "approve" | "review" | "reject";
  reason_codes: string[];
  checked_at: string;
  extracted_claims?: Record<string, unknown>;
}

export interface RevocationWitnessContract {
  credential_id: string;
  revoked: boolean;
  status_list?: {
    list_id: string;
    index: number;
    revoked: boolean;
    updated_at?: string;
  } | null;
  anchor_proof?: {
    batch_id: string;
    root: string;
    proof: string[];
  } | null;
}
