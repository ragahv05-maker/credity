import crypto from "crypto";
import type {
  ProofGenerationRequestContract,
  ProofGenerationResultContract,
  ProofVerificationRequestContract,
  ProofVerificationResultContract,
  MerkleMembershipProofContract,
} from "@credverse/shared-auth";
import { deterministicHash } from "./proof-lifecycle";

export class ProofGenerationError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type CredentialLike = {
  id: string;
  issuerDid?: string | null;
  subjectDid?: string | null;
  vcJwt?: string | null;
  credentialData?: Record<string, unknown> | null;
};

type GenerateProofInput = {
  request: ProofGenerationRequestContract;
  credential?: CredentialLike | null;
  issuerBaseUrl?: string;
};

const SUPPORTED_ZK_CIRCUITS = new Set([
  "score_threshold",
  "age_verification",
  "cross_vertical_aggregate",
]);

function extractZkHookMetadata(
  request: ProofGenerationRequestContract,
): Record<string, unknown> | null {
  const metadata = request.metadata;
  if (!metadata || typeof metadata !== "object") return null;
  const zk = (metadata as Record<string, unknown>).zk;
  if (!zk || typeof zk !== "object") return null;

  const circuit = (zk as Record<string, unknown>).circuit;
  if (typeof circuit !== "string" || !SUPPORTED_ZK_CIRCUITS.has(circuit)) {
    return null;
  }

  return {
    circuit,
    schema: "credity.zk-hook/v1",
  };
}

function toObjectPayload(credential: CredentialLike): Record<string, unknown> {
  if (
    credential.credentialData &&
    typeof credential.credentialData === "object"
  ) {
    return credential.credentialData;
  }

  if (typeof credential.vcJwt === "string" && credential.vcJwt.length > 0) {
    return { vc_jwt: credential.vcJwt };
  }

  return { credential_id: credential.id };
}

function isMerkleMembershipProof(
  value: unknown,
): value is MerkleMembershipProofContract {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const proof = value as Record<string, unknown>;

  const optionalString = (v: unknown) => v === null || typeof v === "string";
  const zkHook = proof.zk_hook;
  const validZkHook =
    zkHook === null ||
    zkHook === undefined ||
    (typeof zkHook === "object" &&
      !Array.isArray(zkHook) &&
      typeof (zkHook as Record<string, unknown>).schema === "string");

  return (
    proof.type === "credity.merkle-membership-proof/v1" &&
    proof.verification_contract === "credity-proof-verification/v1" &&
    proof.canonicalization === "RFC8785-V1" &&
    proof.hash_algorithm === "sha256" &&
    typeof proof.issued_at === "string" &&
    typeof proof.credential_id === "string" &&
    optionalString(proof.issuer_did) &&
    optionalString(proof.subject_did) &&
    optionalString(proof.challenge) &&
    optionalString(proof.domain) &&
    optionalString(proof.nonce) &&
    typeof proof.claims_digest === "string" &&
    typeof proof.leaf_hash === "string" &&
    typeof proof.verification_endpoint === "string" &&
    validZkHook
  );
}

export function generateProof({
  request,
  credential,
  issuerBaseUrl,
}: GenerateProofInput): ProofGenerationResultContract {
  const format = request.format;

  if (format !== "merkle-membership") {
    return {
      id: `proof_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
      status: "unsupported",
      format,
      proof: null,
      public_signals: null,
      credential_id: request.credential_id ?? null,
      created_at: new Date().toISOString(),
      reason: `Proof format ${format} requires a production prover integration. This deployment only enables merkle-membership.`,
    };
  }

  if (!request.credential_id) {
    throw new ProofGenerationError(
      400,
      "PROOF_CREDENTIAL_ID_REQUIRED",
      "credential_id is required for merkle-membership proof generation",
    );
  }

  if (!credential || credential.id !== request.credential_id) {
    throw new ProofGenerationError(
      404,
      "PROOF_CREDENTIAL_NOT_FOUND",
      "Credential not found for proof generation",
    );
  }

  const sourcePayload = toObjectPayload(credential);
  const claimsDigest = deterministicHash(sourcePayload, "sha256", "RFC8785-V1");
  const leafHash = deterministicHash(
    {
      credential_id: request.credential_id,
      claims_digest: claimsDigest,
      nonce: request.nonce ?? null,
    },
    "sha256",
    "RFC8785-V1",
  );

  const createdAt = new Date().toISOString();
  const zkHook = extractZkHookMetadata(request);
  const proof: MerkleMembershipProofContract = {
    type: "credity.merkle-membership-proof/v1",
    verification_contract: "credity-proof-verification/v1",
    canonicalization: "RFC8785-V1",
    hash_algorithm: "sha256",
    issued_at: createdAt,
    credential_id: request.credential_id,
    issuer_did: credential.issuerDid || null,
    subject_did: request.subject_did || credential.subjectDid || null,
    challenge: request.challenge || null,
    domain: request.domain || null,
    nonce: request.nonce || null,
    claims_digest: claimsDigest,
    leaf_hash: leafHash,
    verification_endpoint: `${issuerBaseUrl || ""}/api/v1/proofs/verify`
      .replace(/\/\/+/, "/")
      .replace(":/", "://"),
    zk_hook: zkHook,
  };

  return {
    id: `proof_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
    status: "generated",
    format,
    proof,
    public_signals: {
      claims_digest: claimsDigest,
      leaf_hash: leafHash,
      challenge: request.challenge || null,
      domain: request.domain || null,
    },
    credential_id: request.credential_id,
    created_at: createdAt,
  };
}

export function verifyProof(
  request: ProofVerificationRequestContract,
): ProofVerificationResultContract {
  const checkedAt = new Date().toISOString();

  if (request.format !== "merkle-membership") {
    return {
      id: `verify_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
      valid: false,
      decision: "review",
      reason_codes: ["PROOF_FORMAT_INTEGRATION_REQUIRED"],
      checked_at: checkedAt,
    };
  }

  if (!isMerkleMembershipProof(request.proof)) {
    return {
      id: `verify_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
      valid: false,
      decision: "reject",
      reason_codes: ["PROOF_SCHEMA_INVALID"],
      checked_at: checkedAt,
    };
  }

  const proof = request.proof;
  const reasonCodes: string[] = [];

  if (
    request.challenge !== undefined &&
    request.challenge !== proof.challenge
  ) {
    reasonCodes.push("PROOF_CHALLENGE_MISMATCH");
  }

  if (request.domain !== undefined && request.domain !== proof.domain) {
    reasonCodes.push("PROOF_DOMAIN_MISMATCH");
  }

  if (
    request.expected_issuer_did &&
    request.expected_issuer_did !== proof.issuer_did
  ) {
    reasonCodes.push("PROOF_ISSUER_MISMATCH");
  }

  if (
    request.expected_subject_did &&
    request.expected_subject_did !== proof.subject_did
  ) {
    reasonCodes.push("PROOF_SUBJECT_MISMATCH");
  }

  if (request.expected_claims) {
    const digest = deterministicHash(
      request.expected_claims,
      "sha256",
      "RFC8785-V1",
    );
    if (digest !== proof.claims_digest) {
      reasonCodes.push("PROOF_CLAIMS_DIGEST_MISMATCH");
    }
  }

  const recomputedLeaf = deterministicHash(
    {
      credential_id: proof.credential_id,
      claims_digest: proof.claims_digest,
      nonce: proof.nonce ?? null,
    },
    "sha256",
    "RFC8785-V1",
  );

  if (recomputedLeaf !== proof.leaf_hash) {
    reasonCodes.push("PROOF_LEAF_HASH_MISMATCH");
  }

  return {
    id: `verify_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
    valid: reasonCodes.length === 0,
    decision: reasonCodes.length === 0 ? "approve" : "reject",
    reason_codes: reasonCodes,
    checked_at: checkedAt,
    extracted_claims: {
      credential_id: proof.credential_id,
      issuer_did: proof.issuer_did,
      subject_did: proof.subject_did,
      claims_digest: proof.claims_digest,
      leaf_hash: proof.leaf_hash,
      challenge: proof.challenge,
      domain: proof.domain,
    },
  };
}
