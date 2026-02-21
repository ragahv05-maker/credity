import { type InsertCredential, type Credential } from "@shared/schema";
import { storage } from "../storage";
import { blockchainService } from "./blockchain-service";
import { signVcJwt } from "./vc-signer";
import { randomUUID } from "crypto";
import { signWebhook } from "@credverse/shared-auth";
import { registerCredentialStatus } from "./status-list-service";
import { buildIssuanceEvidenceMetadata } from "./issuance-metadata";
import {
  mapIssuerTrustStatusToDecision,
  WORKSCORE_TRUST_REASON_CODES,
} from "../domain/workscore-trust";

export class RevocationError extends Error {
  constructor(
    message: string,
    public readonly code: "CREDENTIAL_NOT_FOUND" | "CREDENTIAL_ALREADY_REVOKED",
    public readonly status: number,
  ) {
    super(message);
    this.name = "RevocationError";
  }
}

export class IssuanceService {
  // In-memory offer storage (token -> credentialId)
  private offers = new Map<string, string>();

  async issueCredential(
    tenantId: string,
    templateId: string,
    issuerId: string,
    recipient: any,
    credentialData: any,
  ): Promise<Credential> {
    const template = await storage.getTemplate(templateId);
    if (!template) throw new Error("Template not found");

    const issuer = await storage.getIssuer(issuerId);
    if (!issuer) throw new Error("Issuer not found");
    if ((issuer as any).tenantId && (issuer as any).tenantId !== tenantId) {
      throw new Error("Issuer does not belong to tenant");
    }

    // Construct VC Payload following W3C VC Data Model
    const subjectDid = recipient.did || recipient.studentId;
    const issuerDid = issuer.did || `did:web:${issuer.domain}`;
    const issuanceMetadata = buildIssuanceEvidenceMetadata({
      issuerDid,
      credentialType: template.name,
      additionalCredentialTypes: ["VerifiableCredential"],
    });
    const vcPayload = {
      sub: subjectDid,
      iss: issuerDid,
      iat: issuanceMetadata.issuedAtUnix,
      nbf: issuanceMetadata.issuedAtUnix,
      exp: issuanceMetadata.issuedAtUnix + 365 * 24 * 60 * 60, // 1 year
      vc: {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://credverse.io/context/v1",
        ],
        type: ["VerifiableCredential", template.name],
        issuer: {
          id: issuerDid,
          name: issuer.name,
        },
        issuanceDate: issuanceMetadata.issuedAt,
        credentialSubject: {
          id: subjectDid,
          ...credentialData,
        },
      },
    };

    const vcJwt = await signVcJwt(vcPayload, vcPayload.iss);

    // Create credential in database
    const credential = await storage.createCredential({
      tenantId,
      templateId,
      issuerId,
      format: "vc+jwt",
      issuerDid,
      subjectDid,
      issuanceFlow: "legacy",
      recipient,
      credentialData,
      vcJwt,
      revoked: false,
    });

    const statusRegistration = await registerCredentialStatus(credential.id);
    (credential as any).statusListId = statusRegistration.listId;
    (credential as any).statusListIndex = statusRegistration.index;
    (credential as any).format = "vc+jwt";
    (credential as any).issuanceFlow = "legacy";

    // IMPORTANT: The verifier computes deterministic hashes over the W3C VC object.
    // Anchor the same canonical object on-chain so recruiter checks can match.
    const anchorInput = vcPayload.vc;
    const anchorMode = (
      process.env.BLOCKCHAIN_ANCHOR_MODE || "async"
    ).toLowerCase();
    if (anchorMode !== "off") {
      const anchorTask = async () => {
        console.log(
          `[Issuance] Anchoring credential ${credential.id} on blockchain...`,
        );
        const anchorResult =
          await blockchainService.anchorCredential(anchorInput);
        if (anchorResult.success) {
          console.log(
            `[Issuance] Credential ${credential.id} anchored: ${anchorResult.txHash}`,
          );
          await storage.updateCredentialBlockchain(credential.id, {
            txHash: anchorResult.txHash,
            blockNumber: anchorResult.blockNumber,
            credentialHash: anchorResult.hash,
          });
          (credential as any).txHash = anchorResult.txHash;
          (credential as any).blockNumber = anchorResult.blockNumber;
          (credential as any).credentialHash = anchorResult.hash;
          return anchorResult;
        }

        console.warn(
          `[Issuance] Blockchain anchor failed for ${credential.id}: ${anchorResult.error}`,
        );
        return anchorResult;
      };

      if (anchorMode === "sync") {
        await anchorTask();
      } else {
        void anchorTask().catch((e) => {
          console.error(
            `[Issuance] Async anchor failed for ${credential.id}:`,
            e,
          );
        });
      }
    } else {
      console.log(
        `[Issuance] Blockchain anchoring disabled for credential ${credential.id}`,
      );
    }

    // Webhook Notification
    if (recipient.webhookUrl) {
      console.log(`[Issuance] Sending webhook to ${recipient.webhookUrl}`);
      const webhookBody = {
        event: "credential_issued",
        credentialId: credential.id,
        vcJwt,
        recipient: recipient.did || recipient.email,
      };
      const webhookSecret = process.env.CREDENTIAL_WEBHOOK_SECRET;
      const signed = webhookSecret
        ? signWebhook(webhookBody, webhookSecret)
        : null;
      fetch(recipient.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(signed
            ? {
                "X-Webhook-Timestamp": signed.timestamp,
                "X-Webhook-Signature": `sha256=${signed.signature}`,
              }
            : {}),
        },
        body: signed ? signed.payload : JSON.stringify(webhookBody),
      }).catch((e) => console.error("[Issuance] Webhook failed:", e));
    }

    // Email Notification
    if (recipient.email) {
      try {
        const { emailService } = await import("./email");
        await emailService.sendCredentialNotification({
          to: recipient.email,
          recipientName: recipient.name || "Student",
          credentialType: template.name,
          issuerName: issuer.name,
          viewLink: `${process.env.APP_URL || "http://localhost:5002"}/credential/${credential.id}`,
        });
      } catch (e) {
        console.error("[Issuance] Email notification failed:", e);
      }
    }

    // Attach non-sensitive audit metadata for downstream verifiers/recruiters.
    // NOTE: This is additive and does not change the VC signature surface (stored vcJwt stays authoritative).
    const issuerTrustStatus = (issuer as any).trustStatus ?? "unknown";
    const trustDecision = mapIssuerTrustStatusToDecision(issuerTrustStatus);
    const trustReasonCodes =
      trustDecision === "trusted"
        ? [WORKSCORE_TRUST_REASON_CODES.VERIFIED_DID_CONTROL]
        : trustDecision === "revoked"
          ? [WORKSCORE_TRUST_REASON_CODES.SANCTIONED_OR_BLOCKLISTED]
          : [WORKSCORE_TRUST_REASON_CODES.MANUAL_REVIEW_REQUIRED];

    (credential as any).audit = {
      issuance: {
        mode: "legacy",
        issuedAt: issuanceMetadata.issuedAt,
        issuedAtUnix: issuanceMetadata.issuedAtUnix,
        issuerDid: issuanceMetadata.issuerDid,
        subjectDid,
        credentialType: issuanceMetadata.credentialType,
        credentialTypeNormalized: issuanceMetadata.credentialTypeNormalized,
        credentialTypes: issuanceMetadata.credentialTypes,
        credentialTypesNormalized: issuanceMetadata.credentialTypesNormalized,
        template: {
          id: templateId,
          name: template.name,
          version: template.version,
        },
      },
      trust: {
        issuerTrustStatus,
        decision: trustDecision,
        reasonCodes: trustReasonCodes,
      },
    };

    const anchored =
      typeof (credential as any).txHash === "string" &&
      (credential as any).txHash.length > 0;
    (credential as any).anchor = {
      mode: anchorMode,
      status:
        anchorMode === "off" ? "disabled" : anchored ? "anchored" : "pending",
      txHash: (credential as any).txHash ?? null,
      blockNumber: (credential as any).blockNumber ?? null,
      credentialHash: (credential as any).credentialHash ?? null,
    };

    // Log the issuance activity
    await storage.createActivityLog({
      tenantId,
      type: "credential_issued",
      title: `Credential Issued: ${template.name}`,
      description: `Issued ${template.name} to ${recipient.name || recipient.email}`,
      metadata: {
        credentialId: credential.id,
        templateName: template.name,
        recipientName: recipient.name,
        webhookSent: !!recipient.webhookUrl,
        anchor: (credential as any).anchor,
      },
    });

    return credential;
  }

  createOffer(credentialId: string): string {
    const token = randomUUID();
    this.offers.set(token, credentialId);
    // Expire in 1 hour
    setTimeout(() => this.offers.delete(token), 60 * 60 * 1000);
    return token;
  }

  getOfferCredentialId(token: string): string | undefined {
    return this.offers.get(token);
  }

  async bulkIssue(
    tenantId: string,
    templateId: string,
    issuerId: string,
    recipientsData: any[],
  ): Promise<{ jobId: string; total: number; queued: boolean }> {
    const total = recipientsData.length;

    // Try to use Redis queue if available
    try {
      const { addBulkIssuanceJob, isQueueAvailable } =
        await import("./queue-service");

      if (isQueueAvailable()) {
        const result = await addBulkIssuanceJob({
          tenantId,
          templateId,
          issuerId,
          recipients: recipientsData,
        });

        console.log(
          `[Issuance] Bulk job ${result.jobId} queued for ${total} credentials`,
        );
        return { jobId: result.jobId, total, queued: true };
      }
    } catch (e) {
      console.log("[Issuance] Queue service not available, using fallback");
    }

    throw new Error(
      "Bulk issuance queue is unavailable. Configure REDIS_URL or disable bulk issuance.",
    );
  }

  async revokeCredential(
    credentialId: string,
    reason: string,
  ): Promise<{ alreadyRevoked: boolean }> {
    const credential = await storage.getCredential(credentialId);
    if (!credential) {
      throw new RevocationError(
        "Credential not found",
        "CREDENTIAL_NOT_FOUND",
        404,
      );
    }

    if (credential.revoked) {
      return { alreadyRevoked: true };
    }

    // Revoke on blockchain
    if ((credential as any).credentialHash) {
      console.log(
        `[Issuance] Revoking credential ${credentialId} on blockchain...`,
      );
      const result = await blockchainService.revokeCredential(
        (credential as any).credentialHash,
        reason,
      );
      if (result.success) {
        console.log(`[Issuance] Credential revoked on-chain: ${result.txHash}`);
      }
    }

    // Revoke in database
    await storage.revokeCredential(credentialId);

    const recipient = (credential as any).recipient;
    const webhookUrl = recipient?.webhookUrl;
    if (webhookUrl) {
      const webhookBody = {
        event: "credential_revoked",
        credentialId,
        reason,
      };
      const webhookSecret = process.env.CREDENTIAL_WEBHOOK_SECRET;
      const signed = webhookSecret
        ? signWebhook(webhookBody, webhookSecret)
        : null;
      fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(signed
            ? {
                "X-Webhook-Timestamp": signed.timestamp,
                "X-Webhook-Signature": `sha256=${signed.signature}`,
              }
            : {}),
        },
        body: signed ? signed.payload : JSON.stringify(webhookBody),
      }).catch((error) => {
        console.error("[Issuance] Revocation webhook failed:", error);
      });
    }

    // Log activity
    await storage.createActivityLog({
      tenantId: credential.tenantId,
      type: "credential_revoked",
      title: "Credential Revoked",
      description: `Revoked credential ${credentialId}: ${reason}`,
      metadata: { credentialId, reason },
    });

    return { alreadyRevoked: false };
  }
}

export const issuanceService = new IssuanceService();
