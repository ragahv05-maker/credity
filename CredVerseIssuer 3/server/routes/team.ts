import { Router } from "express";
import { storage } from "../storage";
import { apiKeyMiddleware } from "../auth";
import { emailService } from "../services/email";

const router = Router();
router.use("/team", apiKeyMiddleware);

// List all team members
router.get("/team", async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const members = await storage.listTeamMembers(tenantId);
    res.json(members);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch team members" });
  }
});

// Get single team member
router.get("/team/:id", async (req, res) => {
  try {
    const member = await storage.getTeamMember(req.params.id);
    if (!member) {
      return res.status(404).json({ message: "Team member not found" });
    }
    res.json(member);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch team member" });
  }
});

// Invite new team member (sends email)
router.post("/team/invite", async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const { name, email, role } = req.body;

    if (!name || !email || !role) {
      return res
        .status(400)
        .json({ message: "Name, email, and role are required" });
    }

    // Check if member already exists
    const existingMembers = await storage.listTeamMembers(tenantId);
    if (
      existingMembers.some((m) => m.email.toLowerCase() === email.toLowerCase())
    ) {
      return res
        .status(409)
        .json({ message: "A team member with this email already exists" });
    }

    // Create team member with Pending status
    const member = await storage.createTeamMember({
      tenantId,
      name,
      email,
      role,
      status: "Pending",
    });

    // Send invitation email
    try {
      await emailService.sendTeamInvite({
        to: email,
        inviterName: "Admin",
        organizationName: "University of North",
        role,
        inviteLink: `${process.env.APP_URL || "http://localhost:5001"}/join?token=${member.id}`,
      });
    } catch (emailError) {
      console.error("Failed to send invite email:", emailError);
      // Still return success, but note email failed
      return res.status(201).json({
        ...member,
        _emailSent: false,
        _emailError: "Email service not configured",
      });
    }

    res.status(201).json({ ...member, _emailSent: true });
  } catch (error) {
    res.status(500).json({ message: "Failed to invite team member" });
  }
});

// Update team member role
router.put("/team/:id/role", async (req, res) => {
  try {
    const { role } = req.body;
    if (!role || !["Admin", "Issuer", "Viewer"].includes(role)) {
      return res
        .status(400)
        .json({ message: "Valid role is required (Admin, Issuer, Viewer)" });
    }

    const updated = await storage.updateTeamMember(req.params.id, { role });
    if (!updated) {
      return res.status(404).json({ message: "Team member not found" });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Failed to update team member" });
  }
});

// Update team member status
router.put("/team/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !["Active", "Pending", "Inactive"].includes(status)) {
      return res.status(400).json({ message: "Valid status is required" });
    }

    const updated = await storage.updateTeamMember(req.params.id, {
      status,
      joinedAt: status === "Active" ? new Date() : undefined,
    });
    if (!updated) {
      return res.status(404).json({ message: "Team member not found" });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Failed to update team member" });
  }
});

// Remove team member
router.delete("/team/:id", async (req, res) => {
  try {
    const deleted = await storage.deleteTeamMember(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Team member not found" });
    }
    res.json({ message: "Team member removed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to remove team member" });
  }
});

export default router;
