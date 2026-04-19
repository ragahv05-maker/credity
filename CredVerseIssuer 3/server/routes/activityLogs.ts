import { Router } from "express";
import { storage } from "../storage";
import { apiKeyMiddleware } from "../auth";

const router = Router();
router.use("/activity-logs", apiKeyMiddleware);
router.use("/reports", apiKeyMiddleware);

// Activity log types
export interface ActivityLog {
    id: string;
    tenantId: string;
    userId: string;
    userName: string;
    action: string;
    details: string;
    entityType: "credential" | "student" | "template" | "team" | "settings";
    entityId: string;
    timestamp: Date;
    ipAddress: string;
}

// In-memory activity logs
const activityLogs: Map<string, ActivityLog> = new Map();

// Seed some initial activity
function seedActivityLogs(tenantId: string) {
    const actions = [
        { action: "Issued credential", details: "Degree Certificate to Aditi Sharma", entityType: "credential" as const },
        { action: "Updated template", details: "Modified Semester Grade Card layout", entityType: "template" as const },
        { action: "Added student", details: "Imported 150 students via CSV", entityType: "student" as const },
        { action: "Changed role", details: "Sarah Jenkins role changed to Issuer", entityType: "team" as const },
        { action: "Revoked credential", details: "Revoked CRED-2023-001 due to error", entityType: "credential" as const },
        { action: "Login", details: "Admin logged in from Mumbai, IN", entityType: "settings" as const },
        { action: "Export", details: "Downloaded verification logs CSV", entityType: "settings" as const },
        { action: "Invited member", details: "Sent invite to john@university.edu", entityType: "team" as const },
    ];

    actions.forEach((a, i) => {
        const id = `activity-${i + 1}`;
        activityLogs.set(id, {
            id,
            tenantId,
            userId: "admin",
            userName: "Admin User",
            action: a.action,
            details: a.details,
            entityType: a.entityType,
            entityId: `entity-${i}`,
            timestamp: new Date(Date.now() - i * 3600000),
            ipAddress: "192.168.1.100",
        });
    });
}

// Seed on first run
seedActivityLogs("default-tenant-id");

// Get all activity logs
router.get("/activity-logs", async (req, res) => {
    try {
        const tenantId = (req as any).tenantId;
        const { userId, entityType, limit } = req.query;

        let logs = Array.from(activityLogs.values())
            .filter(l => l.tenantId === tenantId)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        if (userId) {
            logs = logs.filter(l => l.userId === userId);
        }

        if (entityType) {
            logs = logs.filter(l => l.entityType === entityType);
        }

        if (limit) {
            logs = logs.slice(0, parseInt(limit as string));
        }

        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch activity logs" });
    }
});

// Get activity for specific user (for team View Activity Log)
router.get("/activity-logs/user/:userId", async (req, res) => {
    try {
        const tenantId = (req as any).tenantId;
        const logs = Array.from(activityLogs.values())
            .filter(l => l.tenantId === tenantId && l.userId === req.params.userId)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch user activity" });
    }
});

// Log activity (internal use)
router.post("/activity-logs", async (req, res) => {
    try {
        const tenantId = (req as any).tenantId;
        const { userId, userName, action, details, entityType, entityId } = req.body;

        const id = `activity-${Date.now()}`;
        const log: ActivityLog = {
            id,
            tenantId,
            userId: userId || "admin",
            userName: userName || "Admin User",
            action,
            details,
            entityType,
            entityId: entityId || "",
            timestamp: new Date(),
            ipAddress: req.ip || "0.0.0.0",
        };

        activityLogs.set(id, log);
        res.status(201).json(log);
    } catch (error) {
        res.status(500).json({ message: "Failed to log activity" });
    }
});

// Generate dashboard report
router.get("/reports/dashboard", async (req, res) => {
    try {
        const tenantId = (req as any).tenantId;

        const credentials = await storage.listCredentials(tenantId);
        const students = await storage.listStudents(tenantId);
        const templates = await storage.listTemplateDesigns(tenantId);
        const logs = await storage.listVerificationLogs(tenantId);

        // Generate CSV report
        const reportDate = new Date().toLocaleDateString();
        const csv = `CredVerse Dashboard Report - ${reportDate}

SUMMARY
=======
Total Credentials Issued,${credentials.length}
Active Credentials,${credentials.filter(c => !c.revoked).length}
Revoked Credentials,${credentials.filter(c => c.revoked).length}
Total Students,${students.length}
Active Students,${students.filter(s => s.status === 'Active').length}
Templates,${templates.length}
Verification Events,${logs.length}

CREDENTIALS
===========
ID,Template,Status,Created
${credentials.map(c => `${c.id},${c.templateId},${c.revoked ? 'Revoked' : 'Active'},${c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A'}`).join('\n')}

RECENT VERIFICATIONS
====================
Credential,Verifier,Location,Time,Status
${logs.slice(0, 10).map(l => `${l.credentialId},${l.verifierName},${l.verifierLocation},${l.timestamp.toLocaleString()},${l.status}`).join('\n')}
`;

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename=dashboard-report-${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);
    } catch (error) {
        res.status(500).json({ message: "Failed to generate report" });
    }
});

export default router;
