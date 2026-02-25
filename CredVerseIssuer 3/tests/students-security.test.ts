import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { storage } from '../server/storage';
import studentsRoutes from '../server/routes/students';

// Mock the auth middleware to bypass real authentication
vi.mock('../server/auth', () => ({
    apiKeyMiddleware: (req: Request, res: Response, next: NextFunction) => next()
}));

const app = express();
app.use(express.json());

// Mock middleware that blindly trusts x-tenant-id header
// This simulates the behavior of apiKeyMiddleware which sets req.tenantId
app.use((req, res, next) => {
    const tenantId = req.headers['x-tenant-id'];
    if (tenantId) {
        (req as any).tenantId = tenantId;
    }
    next();
});

// Mount routes
app.use('/api/v1', studentsRoutes);

describe('Student IDOR Vulnerability', () => {
    const tenantA = 'tenant-a-uuid';
    const tenantB = 'tenant-b-uuid';
    let studentId: string;

    beforeEach(async () => {
        // Create student for Tenant A
        const student = await storage.createStudent({
            tenantId: tenantA,
            name: 'Student A',
            email: 'studentA@example.com',
            studentId: 'S001',
            program: 'CS',
            enrollmentYear: '2023',
            status: 'Active'
        });
        studentId = student.id;
    });

    afterEach(async () => {
        // Clean up
        if (studentId) {
            await storage.deleteStudent(studentId);
        }
    });

    it('should allow Tenant A to access their student', async () => {
        const res = await request(app)
            .get(`/api/v1/students/${studentId}`)
            .set('x-tenant-id', tenantA);

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(studentId);
    });

    it('should NOT allow Tenant B to access Tenant A student', async () => {
        const res = await request(app)
            .get(`/api/v1/students/${studentId}`)
            .set('x-tenant-id', tenantB);

        // If vulnerable, this returns 200.
        // We assert it should NOT be 200 (expect 403 or 404).
        expect(res.status).not.toBe(200);
    });

    it('should NOT allow Tenant B to update Tenant A student', async () => {
        const res = await request(app)
            .put(`/api/v1/students/${studentId}`)
            .set('x-tenant-id', tenantB)
            .send({ name: 'Hacked Name' });

        // If vulnerable, this returns 200.
        expect(res.status).not.toBe(200);
    });

    it('should NOT allow Tenant B to delete Tenant A student', async () => {
        const res = await request(app)
            .delete(`/api/v1/students/${studentId}`)
            .set('x-tenant-id', tenantB);

        // If vulnerable, this returns 200.
        expect(res.status).not.toBe(200);
    });
});
