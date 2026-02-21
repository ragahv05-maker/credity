import { Router, Response } from "express";
import { storage } from "../storage";
import { apiKeyMiddleware } from "../auth";
import PDFDocument from "pdfkit";

const router = Router();
router.use("/exports", apiKeyMiddleware);

// Helper to convert array to CSV
function arrayToCSV(data: any[], columns: string[]): string {
  const header = columns.join(",");
  const rows = data.map((item) =>
    columns
      .map((col) => {
        const value = item[col];
        // Escape quotes and wrap in quotes if contains comma or quote
        if (
          typeof value === "string" &&
          (value.includes(",") || value.includes('"'))
        ) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? "";
      })
      .join(","),
  );
  return [header, ...rows].join("\n");
}

// Export credentials as CSV
router.get("/exports/credentials/csv", async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const credentials = await storage.listCredentials(tenantId);

    const columns = [
      "id",
      "templateId",
      "recipient",
      "status",
      "createdAt",
      "revoked",
    ];
    const csv = arrayToCSV(
      credentials.map((c) => ({
        ...c,
        status: c.revoked ? "Revoked" : "Active",
        createdAt: c.createdAt?.toISOString() || new Date().toISOString(),
      })),
      columns,
    );

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=credentials.csv",
    );
    res.send(csv);
  } catch (error) {
    res.status(500).json({ message: "Failed to export credentials" });
  }
});

// Export students as CSV
router.get("/exports/students/csv", async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const students = await storage.listStudents(tenantId);

    const columns = [
      "studentId",
      "name",
      "email",
      "program",
      "enrollmentYear",
      "status",
    ];
    const csv = arrayToCSV(students, columns);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=students.csv");
    res.send(csv);
  } catch (error) {
    res.status(500).json({ message: "Failed to export students" });
  }
});

// Export verification logs as CSV
router.get("/exports/verification-logs/csv", async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const logs = await storage.listVerificationLogs(tenantId);

    const columns = [
      "credentialId",
      "verifierName",
      "verifierLocation",
      "timestamp",
      "status",
      "ipAddress",
    ];
    const csv = arrayToCSV(
      logs.map((l) => ({
        ...l,
        timestamp: l.timestamp.toISOString(),
      })),
      columns,
    );

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=verification-logs.csv",
    );
    res.send(csv);
  } catch (error) {
    res.status(500).json({ message: "Failed to export logs" });
  }
});

// Generate credential PDF
router.get("/exports/credentials/:id/pdf", async (req, res) => {
  try {
    const credential = await storage.getCredential(req.params.id);
    if (!credential) {
      return res.status(404).json({ message: "Credential not found" });
    }

    const tenantId = (req as any).tenantId;
    if (credential.tenantId !== tenantId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // Create PDF document
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 50,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=credential-${credential.id}.pdf`,
    );

    doc.pipe(res);

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

    // Horizontal line
    doc
      .strokeColor("#3B82F6")
      .lineWidth(2)
      .moveTo(50, doc.y)
      .lineTo(doc.page.width - 50, doc.y)
      .stroke();
    doc.moveDown(2);

    // Certificate body
    doc
      .fontSize(14)
      .font("Helvetica")
      .fillColor("#333")
      .text("This is to certify that", { align: "center" });
    doc.moveDown(0.5);

    const recipientName =
      typeof credential.recipient === "object" && credential.recipient !== null
        ? (credential.recipient as any).name || "Recipient"
        : String(credential.recipient || "Recipient");
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

    // Details box
    const detailsY = doc.y;
    doc
      .rect(doc.page.width / 2 - 150, detailsY, 300, 100)
      .fillAndStroke("#F8FAFC", "#E2E8F0");
    doc.fillColor("#333").fontSize(11);
    doc.text(
      `Credential ID: ${credential.id}`,
      doc.page.width / 2 - 140,
      detailsY + 15,
      { width: 280 },
    );
    doc.text(
      `Template: ${credential.templateId}`,
      doc.page.width / 2 - 140,
      detailsY + 35,
      { width: 280 },
    );
    doc.text(
      `Issued: ${credential.createdAt ? new Date(credential.createdAt).toLocaleDateString() : "N/A"}`,
      doc.page.width / 2 - 140,
      detailsY + 55,
      { width: 280 },
    );
    doc.text(
      `Status: ${credential.revoked ? "REVOKED" : "VALID"}`,
      doc.page.width / 2 - 140,
      detailsY + 75,
      { width: 280 },
    );

    doc.moveDown(6);

    // Signatures
    const sigY = doc.y;
    doc.strokeColor("#333").lineWidth(1);
    doc.moveTo(100, sigY).lineTo(250, sigY).stroke();
    doc
      .moveTo(doc.page.width - 250, sigY)
      .lineTo(doc.page.width - 100, sigY)
      .stroke();

    doc.fontSize(10).fillColor("#666");
    doc.text("Registrar", 100, sigY + 5, { width: 150, align: "center" });
    doc.text("Dean", doc.page.width - 250, sigY + 5, {
      width: 150,
      align: "center",
    });

    // Footer
    doc
      .fontSize(8)
      .fillColor("#999")
      .text(
        `Verification: ${process.env.APP_URL || "https://credverse.app"}/verify/${credential.id}`,
        50,
        doc.page.height - 50,
        { align: "center", width: doc.page.width - 100 },
      );

    doc.end();
  } catch (error) {
    console.error("PDF generation error:", error);
    res.status(500).json({ message: "Failed to generate PDF" });
  }
});

// Download sample CSV template for bulk import
router.get("/exports/sample-csv", (req, res) => {
  const sampleCSV = `name,email,studentId,credentialType,major
John Doe,john.doe@email.com,STU-001,Degree Certificate 2025,Computer Science
Jane Smith,jane.smith@email.com,STU-002,Degree Certificate 2025,Electrical Engineering
Bob Johnson,bob.j@email.com,STU-003,Course Completion,Data Science`;

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=sample_import_template.csv",
  );
  res.send(sampleCSV);
});

export default router;
