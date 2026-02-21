import { Router } from "express";
import { storage } from "../storage";
import { apiKeyMiddleware } from "../auth";

const router = Router();
router.use("/template-designs", apiKeyMiddleware);

// List all template designs
router.get("/template-designs", async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const templates = await storage.listTemplateDesigns(tenantId);
    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch templates" });
  }
});

// Get single template design
router.get("/template-designs/:id", async (req, res) => {
  try {
    const template = await storage.getTemplateDesign(req.params.id);
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }
    res.json(template);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch template" });
  }
});

// Create new template design
router.post("/template-designs", async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const { name, category, type, fields, backgroundColor, width, height } =
      req.body;

    if (!name) {
      return res.status(400).json({ message: "Template name is required" });
    }

    const template = await storage.createTemplateDesign({
      tenantId,
      name,
      category: category || "Education",
      type: type || "A4 Landscape",
      status: "Draft",
      fields: fields || [],
      backgroundColor: backgroundColor || "#ffffff",
      width: width || 842,
      height: height || 595,
    });

    res.status(201).json(template);
  } catch (error) {
    res.status(500).json({ message: "Failed to create template" });
  }
});

// Update template design
router.put("/template-designs/:id", async (req, res) => {
  try {
    const template = await storage.getTemplateDesign(req.params.id);
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    const tenantId = (req as any).tenantId;
    if (template.tenantId !== tenantId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const updated = await storage.updateTemplateDesign(req.params.id, req.body);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Failed to update template" });
  }
});

// Delete template design
router.delete("/template-designs/:id", async (req, res) => {
  try {
    const template = await storage.getTemplateDesign(req.params.id);
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    const tenantId = (req as any).tenantId;
    if (template.tenantId !== tenantId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await storage.deleteTemplateDesign(req.params.id);
    res.json({ message: "Template deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete template" });
  }
});

// Duplicate template design
router.post("/template-designs/:id/duplicate", async (req, res) => {
  try {
    const template = await storage.getTemplateDesign(req.params.id);
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    const tenantId = (req as any).tenantId;
    if (template.tenantId !== tenantId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const duplicate = await storage.duplicateTemplateDesign(req.params.id);
    res.status(201).json(duplicate);
  } catch (error) {
    res.status(500).json({ message: "Failed to duplicate template" });
  }
});

export default router;
