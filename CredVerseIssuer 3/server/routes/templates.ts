import { Router } from "express";
import { storage } from "../storage";
import { insertTemplateSchema } from "@shared/schema";
import { apiKeyMiddleware } from "../auth";
import { z } from "zod";

const router = Router();

// Public Template Endpoint (for verification)
router.get("/templates/public/:id", async (req, res) => {
  try {
    const template = await storage.getTemplate(req.params.id);
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }
    // Return structured data for verification
    res.json({
      id: template.id,
      name: template.name,
      schema: template.schema,
      version: template.version,
      issuerId: template.tenantId, // or issuer identity
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Keep /templates/public/* accessible without API key.
router.use("/templates", apiKeyMiddleware);

router.post("/templates", async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const parseResult = insertTemplateSchema.safeParse({
      ...req.body,
      tenantId,
    });

    if (!parseResult.success) {
      return res
        .status(400)
        .json({ message: "Invalid template data", errors: parseResult.error });
    }

    const template = await storage.createTemplate(parseResult.data);
    res.status(201).json(template);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/templates", async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const templates = await storage.listTemplates(tenantId);
    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/templates/:id/render", async (req, res) => {
  try {
    const template = await storage.getTemplate(req.params.id);

    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    const tenantId = (req as any).tenantId;
    if (template.tenantId !== tenantId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // MVP: Simple string replacement or just return the render string with data
    // Real implementation would use Handlebars/Liquid
    const data = req.body;
    let rendered = template.render;
    for (const [key, value] of Object.entries(data)) {
      rendered = rendered.replace(new RegExp(`{{${key}}}`, "g"), String(value));
    }

    res.json({ rendered });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

export default router;
