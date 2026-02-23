import { Router } from "express";
import { storage } from "../storage";
import { apiKeyMiddleware } from "../auth";

const router = Router();
router.use("/students", apiKeyMiddleware);

// List all students
router.get("/students", async (req, res) => {
    try {
        const tenantId = (req as any).tenantId;
        const students = await storage.listStudents(tenantId);
        res.json(students);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch students" });
    }
});

// Get single student
router.get("/students/:id", async (req, res) => {
    try {
        const tenantId = (req as any).tenantId;
        const student = await storage.getStudent(req.params.id);
        if (!student || student.tenantId !== tenantId) {
            return res.status(404).json({ message: "Student not found" });
        }
        res.json(student);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch student" });
    }
});

// Create student
router.post("/students", async (req, res) => {
    try {
        const tenantId = (req as any).tenantId;
        const { name, email, studentId, program, enrollmentYear, status } = req.body;

        if (!name || !email || !studentId) {
            return res.status(400).json({ message: "Name, email, and studentId are required" });
        }

        const student = await storage.createStudent({
            tenantId,
            name,
            email,
            studentId,
            program: program || "",
            enrollmentYear: enrollmentYear || new Date().getFullYear().toString(),
            status: status || "Active"
        });

        res.status(201).json(student);
    } catch (error) {
        console.error("Failed to create student:", error);
        res.status(500).json({ message: "Failed to create student", error: String(error) });
    }
});

// Bulk import students from CSV data
router.post("/students/import", async (req, res) => {
    try {
        const tenantId = (req as any).tenantId;
        const { students: studentsData } = req.body;

        if (!Array.isArray(studentsData) || studentsData.length === 0) {
            return res.status(400).json({ message: "Invalid students data" });
        }

        const studentsToCreate = studentsData.map((s: any) => ({
            tenantId,
            name: s.name,
            email: s.email,
            studentId: s.studentId,
            program: s.credentialType || s.program || "",
            enrollmentYear: s.enrollmentYear || new Date().getFullYear().toString(),
            status: "Active" as const
        }));

        const created = await storage.bulkCreateStudents(studentsToCreate);
        res.status(201).json({
            message: `Successfully imported ${created.length} students`,
            count: created.length,
            students: created
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to import students" });
    }
});

// Update student
router.put("/students/:id", async (req, res) => {
    try {
        const tenantId = (req as any).tenantId;
        const student = await storage.getStudent(req.params.id);

        if (!student || student.tenantId !== tenantId) {
            return res.status(404).json({ message: "Student not found" });
        }

        const updated = await storage.updateStudent(req.params.id, req.body);
        if (!updated) {
            return res.status(404).json({ message: "Student not found" });
        }
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: "Failed to update student" });
    }
});

// Delete student
router.delete("/students/:id", async (req, res) => {
    try {
        const tenantId = (req as any).tenantId;
        const student = await storage.getStudent(req.params.id);

        if (!student || student.tenantId !== tenantId) {
            return res.status(404).json({ message: "Student not found" });
        }

        const deleted = await storage.deleteStudent(req.params.id);
        if (!deleted) {
            return res.status(404).json({ message: "Student not found" });
        }
        res.json({ message: "Student deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Failed to delete student" });
    }
});

export default router;
