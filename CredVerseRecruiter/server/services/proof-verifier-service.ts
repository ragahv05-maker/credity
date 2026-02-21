import crypto from "crypto";
import type {
  ProofVerificationRequestContract,
  ProofVerificationResultContract,
} from "@credverse/shared-auth";
import { verificationEngine } from "./verification-engine";
import {
  deterministicHash,
  deterministicHashLegacyTopLevel,
  parseCanonicalization,
  parseProofAlgorithm,
} from "./proof-lifecycle";

export class ProofVerificationError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type VerifyInput = ProofVerificationRequestContract & {
  expected_hash?: string;
  hash_algorithm?: "sha256" | "keccak256";
};

const SUPPORTED_ZK_CIRCUITS = new Set([
  "score_threshold",
  "age_verification",
  "cross_vertical_aggregate",
]);

function makeResult(
  valid: boolean,
  reasonCodes: string[],
  extractedClaims?: Record<string, unknown>,
): ProofVerificationResultContract {
  return {
    id: `proof_verify_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
    valid,
    decision: valid ? "approve" : "reject",
    reason_codes: reasonCodes,
    checked_at: new Date().toISOString(),
    extracted_claims: extractedClaims,
  };
}

function verifyMerkleMembership(input: VerifyInput): {
  valid: boolean;
  reasonCodes: string[];
} {
  const reasonCodes: string[] = [];
  const proof = input.proof;

  if (!proof || typeof proof !== "object") {
    throw new ProofVerificationError(
      400,
      "PROOF_INPUT_INVALID",
      "merkle-membership proof must be an object",
    );
  }

  const p = proof as Record<string, unknown>;
  const credentialId =
    typeof p.credential_id === "string" ? p.credential_id : null;
  const claimsDigest =
    typeof p.claims_digest === "string" ? p.claims_digest : null;
  const providedLeaf = typeof p.leaf_hash === "string" ? p.leaf_hash : null;

  if (!credentialId || !claimsDigest || !providedLeaf) {
    throw new ProofVerificationError(
      400,
      "PROOF_INPUT_INVALID",
      "proof credential_id, claims_digest and leaf_hash are required",
    );
  }

  const expectedLeaf = deterministicHash(
    {
      credential_id: credentialId,
      claims_digest: claimsDigest,
      nonce: typeof p.nonce === "string" ? p.nonce : null,
    },
    "sha256",
    "RFC8785-V1",
  );

  let valid = true;

  if (expectedLeaf !== providedLeaf) {
    valid = false;
    reasonCodes.push("PROOF_LEAF_HASH_MISMATCH");
  }

  if (input.challenge && p.challenge !== input.challenge) {
    valid = false;
    reasonCodes.push("PROOF_CHALLENGE_MISMATCH");
  }

  if (input.domain && p.domain !== input.domain) {
    valid = false;
    reasonCodes.push("PROOF_DOMAIN_MISMATCH");
  }

  if (input.expected_issuer_did && p.issuer_did !== input.expected_issuer_did) {
    valid = false;
    reasonCodes.push("ISSUER_DID_MISMATCH");
  }

  if (
    input.expected_subject_did &&
    p.subject_did !== input.expected_subject_did
  ) {
    valid = false;
    reasonCodes.push("SUBJECT_DID_MISMATCH");
  }

  return { valid, reasonCodes };
}

export async function verifyProofContract(
  input: VerifyInput,
): Promise<ProofVerificationResultContract & { code: string }> {
  let valid = false;
  const reasonCodes: string[] = [];

  if (typeof input.proof === "string") {
    if (input.proof.split(".").length < 2) {
      throw new ProofVerificationError(
        400,
        "PROOF_INPUT_INVALID",
        "Invalid JWT proof format",
      );
    }

    const verificationResult = await verificationEngine.verifyCredential({
      jwt: input.proof,
    });
    valid = verificationResult.status === "verified";
    reasonCodes.push(...verificationResult.riskFlags);
  } else if (input.format === "merkle-membership") {
    const result = verifyMerkleMembership(input);
    valid = result.valid;
    reasonCodes.push(...result.reasonCodes);
  } else {
    const proofObject = input.proof as Record<string, unknown>;
    valid = true;

    if (input.expected_issuer_did) {
      const issuer = proofObject.issuer;
      const issuerDid =
        typeof issuer === "string"
          ? issuer
          : (issuer as Record<string, unknown> | undefined)?.id;
      if (issuerDid !== input.expected_issuer_did) {
        valid = false;
        reasonCodes.push("ISSUER_DID_MISMATCH");
      }
    }

    if (input.expected_subject_did) {
      const subject = proofObject.credentialSubject;
      const subjectDid =
        typeof subject === "string"
          ? subject
          : (subject as Record<string, unknown> | undefined)?.id;
      if (subjectDid !== input.expected_subject_did) {
        valid = false;
        reasonCodes.push("SUBJECT_DID_MISMATCH");
      }
    }
  }

  if (typeof input.proof === "object") {
    const zkHook = (input.proof as Record<string, unknown>).zk_hook;
    if (zkHook && typeof zkHook === "object") {
      const circuit = (zkHook as Record<string, unknown>).circuit;
      if (typeof circuit !== "string" || !SUPPORTED_ZK_CIRCUITS.has(circuit)) {
        valid = false;
        reasonCodes.push("ZK_CIRCUIT_UNSUPPORTED");
      }
    }
  }

  if (
    typeof input.expected_hash === "string" &&
    typeof input.proof === "object"
  ) {
    const algorithm = parseProofAlgorithm(input.hash_algorithm);
    const canonicalization = parseCanonicalization(
      (input.proof as any)?.canonicalization,
    );
    const computed = deterministicHash(
      input.proof,
      algorithm,
      canonicalization,
    );
    const legacyComputed = deterministicHashLegacyTopLevel(
      input.proof,
      algorithm,
    );
    if (
      computed !== input.expected_hash &&
      legacyComputed !== input.expected_hash
    ) {
      valid = false;
      reasonCodes.push("PROOF_HASH_MISMATCH");
    }
  }

  if (input.revocation_witness?.revoked) {
    valid = false;
    reasonCodes.push("REVOKED_CREDENTIAL");
  }

  if (!valid && reasonCodes.length === 0) {
    reasonCodes.push("PROOF_VALIDATION_FAILED");
  }

  const result = makeResult(valid, reasonCodes, input.expected_claims);
  return {
    ...result,
    code: valid ? "PROOF_VALID" : reasonCodes[0] || "PROOF_VALIDATION_FAILED",
  };
}
