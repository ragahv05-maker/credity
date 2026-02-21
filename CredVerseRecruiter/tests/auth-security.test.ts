
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import { registerRoutes } from '../server/routes';

// Mock dependencies
vi.mock('../server/services/blockchain-service', () => ({
  blockchainService: {
    getRuntimeStatus: vi.fn().mockReturnValue({ configured: false }),
  },
}));

// Mock storage to avoid actual DB/Memory persistence issues during tests
vi.mock('../server/storage', () => {
    const users = new Map();
    return {
        storage: {
            getUserByUsername: vi.fn((username) => Promise.resolve(users.get(username))),
            createUser: vi.fn((user) => {
                const newUser = { ...user, id: 'test-id' };
                users.set(user.username, newUser);
                return Promise.resolve(newUser);
            }),
            getUser: vi.fn((id) => Promise.resolve({ id, username: 'test' })),
        }
    };
});

describe('Auth Security', () => {
  let app: Express;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    // Basic error handler
    app.use((err: any, req: any, res: any, next: any) => {
        console.error(err);
        res.status(500).json({ error: 'Internal Error' });
    });

    await registerRoutes(app as any, app);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should reject weak passwords during registration', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'newuser',
        password: '123', // Weak password
      });

    // Currently, this is expected to FAIL (it will return 201)
    // Once fixed, it should return 400
    if (response.status === 201) {
        console.log('Vulnerability confirmed: Weak password accepted');
    }

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Password');
  });
});
