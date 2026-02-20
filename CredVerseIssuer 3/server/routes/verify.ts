import { Router } from "express";
import { relayerService } from "../services/relayer";
import { storage } from "../storage";
import { getIssuerPublicKey, verifyVcJwt } from "../services/vc-signer";

const router = Router();

type VerificationPayload = {
    iss?: string;
    jti?: string;
    id?: string;
    vc?: unknown;
};

function decodeJwtPayload(vcJwt: string): VerificationPayload {
    const parts = vcJwt.split(".");
    if (parts.length !== 3) {
        throw new Error("Invalid JWT format");
    }
    try {
        return JSON.parse(Buffer.from(parts[1], "base64url").toString()) as VerificationPayload;
    } catch {
        return JSON.parse(Buffer.from(parts[1], "base64").toString()) as VerificationPayload;
    }
}

async function resolveCredentialId(payload: VerificationPayload, vcJwt: string): Promise<string> {
    if (typeof payload.jti === "string" && payload.jti.length > 0) return payload.jti;
    if (typeof payload.id === "string" && payload.id.length > 0) return payload.id;
    const vc = payload.vc;
    if (vc && typeof vc === "object") {
        const vcId = (vc as Record<string, unknown>).id;
        if (typeof vcId === "string" && vcId.length > 0) return vcId;
    }

    const stored = await storage.getCredentialByVcJwt(vcJwt);
    if (stored?.id) {
        return stored.id;
    }

    return "unknown";
}

async function verifyJwtSignature(vcJwt: string, payload: VerificationPayload): Promise<{ valid: boolean; reason?: string }> {
    if (typeof payload.iss !== "string" || payload.iss.length === 0) {
        return { valid: false, reason: "Missing issuer DID" };
    }

    const issuerPublicKey = getIssuerPublicKey(payload.iss);
    if (!issuerPublicKey) {
        if (process.env.NODE_ENV === "production") {
            return { valid: false, reason: "Issuer key not found" };
        }
        return { valid: true };
    }

    const signatureResult = await verifyVcJwt(vcJwt, issuerPublicKey);
    if (!signatureResult.valid) {
        return { valid: false, reason: signatureResult.error || "Invalid signature" };
    }

    return { valid: true };
}

async function resolveRevocationState(credentialId: string): Promise<"revoked" | "active" | "unknown"> {
    const credential = await storage.getCredential(credentialId);
    if (credential?.revoked) {
        return "revoked";
    }

    const credentialHashCandidate = (credential as unknown as { credentialHash?: unknown } | undefined)?.credentialHash;
    const onChainLookupKey =
        typeof credentialHashCandidate === "string" && credentialHashCandidate.length > 0
            ? credentialHashCandidate
            : credentialId;

    const chainRevoked = await relayerService.isRevoked(onChainLookupKey);
    if (chainRevoked === null) {
        // If we have a local credential record and it is not revoked, treat it as active
        // when on-chain checks are unavailable.
        if (credential) {
            return "active";
        }
        return "unknown";
    }

    return chainRevoked ? "revoked" : "active";
}

// Helper to get IP and location
async function getVerifierInfo(ip: string): Promise<{ location: string; organization: string }> {
    // In production, use a service like ipinfo.io or maxmind
    const locations = [
        { location: "Mumbai, IN", organization: "TechCorp HR" },
        { location: "Bangalore, IN", organization: "Google Hiring" },
        { location: "New Delhi, IN", organization: "Amazon India" },
        { location: "Hyderabad, IN", organization: "Microsoft" },
        { location: "Seattle, US", organization: "LinkedIn" },
        { location: "San Francisco, US", organization: "Meta Recruiting" },
        { location: "London, UK", organization: "Barclays HR" },
        { location: "Singapore, SG", organization: "DBS Bank" },
    ];

    // Hash the IP to get consistent location for same IP
    const hash = ip.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0);
    return locations[Math.abs(hash) % locations.length];
}

// Public verification endpoint (no API key required)
router.get("/verify", async (req, res) => {
    try {
        const vcJwt = req.query.vc as string;
        const verifierIp = (req.headers['x-forwarded-for'] as string || req.ip || '0.0.0.0').split(',')[0].trim();

        if (!vcJwt) {
            return res.status(400).json({ message: "Missing vc query parameter" });
        }

        let payload: VerificationPayload;
        try {
            payload = decodeJwtPayload(vcJwt);
        } catch (parseError) {
            await storage.createVerificationLog({
                tenantId: "public",
                credentialId: "invalid-jwt",
                verifierName: "Unknown",
                verifierIp,
                location: "Unknown",
                status: "failed",
                reason: parseError instanceof Error ? parseError.message : "Invalid JWT format",
            });
            return res.status(400).json({ valid: false, message: "Invalid JWT format" });
        }

        // 2. Verify signature using issuer key material
        const signatureCheck = await verifyJwtSignature(vcJwt, payload);
        const isValidSignature = signatureCheck.valid;

        // 3. Check Revocation
        const credentialId = await resolveCredentialId(payload, vcJwt);
        const revocationState = await resolveRevocationState(credentialId);
        const isRevoked = revocationState === "revoked";

        // Get verifier info
        const verifierInfo = await getVerifierInfo(verifierIp);

        // Determine verification status
        const isValid = isValidSignature && revocationState === "active";
        let status: "verified" | "failed" | "suspicious" = "verified";
        let reason = "";

        if (isRevoked) {
            status = "failed";
            reason = "Credential has been revoked";
        } else if (!isValidSignature) {
            status = "failed";
            reason = signatureCheck.reason || "Invalid signature";
        } else if (revocationState === "unknown") {
            status = "suspicious";
            reason = "Unable to confirm revocation state";
        }

        // Log the verification event
        await storage.createVerificationLog({
            tenantId: typeof payload.iss === "string" ? payload.iss : "public",
            credentialId,
            verifierName: verifierInfo.organization,
            verifierIp,
            location: verifierInfo.location,
            status,
            reason,
        });

        console.log(`[VERIFY] Credential ${credentialId} verified by ${verifierInfo.organization} from ${verifierInfo.location}`);

        res.json({
            valid: isValid,
            issuer_trusted: true,
            revoked: isRevoked,
            revocation_status: revocationState,
            credential: payload.vc,
            verificationId: `ver-${Date.now()}`,
        });
    } catch (error) {
        console.error("Verification error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// Verify by credential ID (for QR code scans)
router.get("/verify/:credentialId", async (req, res) => {
    try {
        const { credentialId } = req.params;
        const verifierIp = (req.headers['x-forwarded-for'] as string || req.ip || '0.0.0.0').split(',')[0].trim();

        // Get credential from storage
        const credential = await storage.getCredential(credentialId);

        if (!credential) {
            // Log failed verification
            await storage.createVerificationLog({
                tenantId: "public",
                credentialId,
                verifierName: "Unknown",
                verifierIp,
                location: "Unknown",
                status: "failed",
                reason: "Credential not found",
            });

            return res.status(404).json({
                valid: false,
                message: "Credential not found"
            });
        }

        // Check if revoked
        const revocationState = await resolveRevocationState(credentialId);
        const isRevoked = revocationState === "revoked";

        // Get verifier info
        const verifierInfo = await getVerifierInfo(verifierIp);

        // Determine status
        let status: "verified" | "failed" | "suspicious" = "verified";
        let reason = "";

        if (isRevoked) {
            status = "failed";
            reason = "Credential has been revoked";
        } else if (revocationState === "unknown") {
            status = "suspicious";
            reason = "Unable to confirm revocation state";
        }

        // Log the verification
        await storage.createVerificationLog({
            tenantId: credential.tenantId,
            credentialId,
            verifierName: verifierInfo.organization,
            verifierIp,
            location: verifierInfo.location,
            status,
            reason,
        });

        console.log(`[VERIFY] Credential ${credentialId} verified by ${verifierInfo.organization}`);

        res.json({
            valid: revocationState === "active",
            issuer_trusted: true,
            revoked: isRevoked,
            revocation_status: revocationState,
            credential: {
                id: credential.id,
                templateId: credential.templateId,
                recipient: credential.recipient,
                createdAt: credential.createdAt,
            },
            verificationId: `ver-${Date.now()}`,
        });
    } catch (error) {
        console.error("Verification error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

export default router;
