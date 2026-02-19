import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock dependencies
const mockSave = vi.fn().mockResolvedValue(undefined);
const mockLoad = vi.fn().mockResolvedValue({ verificationCache: [], bulkJobs: [] });

class MockStore {
    constructor() {}
    load = mockLoad;
    save = mockSave;
}

vi.mock('@credverse/shared-auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@credverse/shared-auth')>();
  return {
    ...actual,
    PostgresStateStore: MockStore,
  };
});

// Set environment variable to trigger database usage
process.env.DATABASE_URL = 'postgres://dummy:5432/db';

describe('VerificationEngine Performance', async () => {
  // Dynamic import to ensure mocks are applied
  const { verificationEngine } = await import('../server/services/verification-engine');

  beforeEach(() => {
    mockSave.mockClear();
    mockLoad.mockClear();
  });

  it('should call save only once during bulk verify (optimized)', async () => {
    const credentials = Array(10).fill({
        raw: { test: 'credential' }
    });

    await verificationEngine.bulkVerify(credentials);

    // Optimized: Only 1 call at the end of bulkVerify
    expect(mockSave).toHaveBeenCalledTimes(1);
  });
});
