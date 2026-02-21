import { Router } from "express";
import { storage } from "../storage";
import { apiKeyMiddleware } from "../auth";
import { digiLockerService } from "../services/digilocker";
import PDFDocument from "pdfkit";

const router = Router();
router.use("/digilocker", apiKeyMiddleware);

// Storage for DigiLocker tokens (in production use proper token storage)
const digiLockerTokens: Map<string, { accessToken: string; expiresAt: Date }> =
  new Map();

// Get DigiLocker status and config
router.get("/digilocker/status", async (req, res) => {
  try {
    const configured = digiLockerService.isReady();
    res.json({
      configured,
      supportedDocTypes: digiLockerService.getSupportedDocTypes(),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to get DigiLocker status" });
  }
});

// Initiate DigiLocker OAuth flow
router.post("/digilocker/auth/initiate", async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const { credentialId } = req.body;

    if (!credentialId) {
      return res.status(400).json({ message: "credentialId is required" });
    }

    const credential = await storage.getCredential(credentialId);
    if (!credential) {
      return res.status(404).json({ message: "Credential not found" });
    }

    if (!digiLockerService.isReady()) {
      return res.status(503).json({
        message:
          "DigiLocker integration is not configured. Set DigiLocker credentials before initiating OAuth.",
      });
    }

    // Generate state token
    const state = Buffer.from(
      JSON.stringify({
        tenantId,
        credentialId,
        timestamp: Date.now(),
      }),
    ).toString("base64");

    const authUrl = digiLockerService.getAuthUrl(state);

    res.json({
      authUrl,
      state,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to initiate DigiLocker auth" });
  }
});

// OAuth callback
router.get("/digilocker/callback", async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!state) {
      return res.redirect("/settings?digilocker=error&message=Invalid%20state");
    }

    const stateData = JSON.parse(
      Buffer.from(state as string, "base64").toString(),
    );

    const tokens = await digiLockerService.exchangeCode(code as string);
    if (!tokens) {
      return res.redirect(
        "/settings?digilocker=error&message=Token%20exchange%20failed",
      );
    }

    // Store token
    digiLockerTokens.set(stateData.tenantId, {
      accessToken: tokens.accessToken,
      expiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
    });

    res.redirect(
      `/settings?digilocker=connected&credentialId=${stateData.credentialId}`,
    );
  } catch (error) {
    res.redirect("/settings?digilocker=error&message=Callback%20failed");
  }
});

// Push credential to DigiLocker
router.post("/digilocker/push", async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const { credentialId, docType, recipientMobile } = req.body;

    if (!credentialId) {
      return res.status(400).json({ message: "credentialId is required" });
    }

    const credential = await storage.getCredential(credentialId);
    if (!credential) {
      return res.status(404).json({ message: "Credential not found" });
    }

    if (!digiLockerService.isReady()) {
      return res.status(503).json({
        message:
          "DigiLocker integration is not configured for push operations.",
      });
    }

    // Get OAuth token
    let accessToken = "";
    const storedToken = digiLockerTokens.get(tenantId);
    if (storedToken && storedToken.expiresAt > new Date()) {
      accessToken = storedToken.accessToken;
    } else {
      return res.status(401).json({
        message:
          "DigiLocker authorization required. Complete OAuth before pushing documents.",
      });
    }

    // Generate PDF content as base64
    const pdfBuffer = await generateCredentialPDF(credential);
    const pdfBase64 = pdfBuffer.toString("base64");

    // Extract recipient info
    const recipientName =
      typeof credential.recipient === "object" && credential.recipient !== null
        ? (credential.recipient as any).name || "Recipient"
        : String(credential.recipient || "Recipient");

    // Push to DigiLocker
    const result = await digiLockerService.pushDocument(accessToken, {
      docType: docType || "CERTIFICATE",
      docRef: credential.id,
      docName: `Credential-${credential.id}`,
      docData: pdfBase64,
      issuerName: "University of North",
      issuerId: tenantId,
      recipientMobile,
      validFrom: credential.createdAt
        ? new Date(credential.createdAt)
        : new Date(),
    });

    if (result.success) {
      // Update credential with DigiLocker reference
      // In a real app, store this in the credential record
      res.json({
        success: true,
        message: "Credential pushed to DigiLocker successfully",
        transactionId: result.transactionId,
        digiLockerUri: result.digiLockerUri,
        recipientName,
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || "Failed to push to DigiLocker",
      });
    }
  } catch (error) {
    console.error("DigiLocker push error:", error);
    res.status(500).json({ message: "Failed to push to DigiLocker" });
  }
});

// Helper function to generate PDF
async function generateCredentialPDF(credential: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 50,
    });

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Header
    doc
      .fontSize(24)
      .font("Helvetica-Bold")
      .text("CREDENTIAL CERTIFICATE", { align: "center" });
    doc.moveDown(0.5);
    doc
      .fontSize(12)
      .font("Helvetica")
      .fillColor("#666")
      .text("Issued by University of North", { align: "center" });
    doc.moveDown(2);

    // Line
    doc
      .strokeColor("#3B82F6")
      .lineWidth(2)
      .moveTo(50, doc.y)
      .lineTo(doc.page.width - 50, doc.y)
      .stroke();
    doc.moveDown(2);

    // Body
    const recipientName =
      typeof credential.recipient === "object" && credential.recipient !== null
        ? (credential.recipient as any).name || "Recipient"
        : String(credential.recipient || "Recipient");

    doc
      .fontSize(14)
      .font("Helvetica")
      .fillColor("#333")
      .text("This is to certify that", { align: "center" });
    doc.moveDown(0.5);
    doc
      .fontSize(28)
      .font("Helvetica-Bold")
      .fillColor("#1E40AF")
      .text(recipientName, { align: "center" });
    doc.moveDown(0.5);
    doc
      .fontSize(14)
      .font("Helvetica")
      .fillColor("#333")
      .text("has been awarded this credential.", { align: "center" });
    doc.moveDown(2);

    // Details
    doc.fontSize(11).fillColor("#333");
    doc.text(`Credential ID: ${credential.id}`, { align: "center" });
    doc.text(`Template: ${credential.templateId}`, { align: "center" });
    doc.text(
      `Issued: ${credential.createdAt ? new Date(credential.createdAt).toLocaleDateString() : "N/A"}`,
      { align: "center" },
    );
    doc.moveDown(2);

    // DigiLocker stamp
    doc.fillColor("#10B981");
    doc
      .fontSize(10)
      .text("✓ DigiLocker Verified Document", { align: "center" });

    doc.end();
  });
}

export default router;
