
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DbStorage } from '../server/storage';
import * as schema from '@shared/schema';

// Mock the db module
vi.mock('../server/db', () => {
  return {
    db: {
      insert: vi.fn(),
      select: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    }
  };
});

import { db } from '../server/db';

describe('DbStorage', () => {
  let storage: DbStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    // We need to ensure db is "connected" for DbStorage methods to run
    // DbStorage checks if (!db) return ...
    // Since we mocked it, it is truthy.
    storage = new DbStorage();
  });

  it('createUser should insert into users table', async () => {
    const mockUser = { id: '123', username: 'test' };
    const insertMock = {
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockUser])
      })
    };
    (db.insert as any).mockReturnValue(insertMock);

    const input = { username: 'test', password: 'pw' };
    const result = await storage.createUser(input);

    expect(db.insert).toHaveBeenCalledWith(schema.users);
    expect(insertMock.values).toHaveBeenCalledWith(input);
    expect(result).toEqual(mockUser);
  });

  it('getUser should select from users table', async () => {
    const mockUser = { id: '123', username: 'test' };
    const selectMock = {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([mockUser])
      })
    };
    (db.select as any).mockReturnValue(selectMock);

    const result = await storage.getUser('123');

    expect(db.select).toHaveBeenCalled();
    expect(selectMock.from).toHaveBeenCalledWith(schema.users);
    // where clause is harder to test with Drizzle mock, but verifying flow is enough
    expect(result).toEqual(mockUser);
  });

  it('createVerificationLog should insert and return log', async () => {
     const mockLog = { id: 'log-1', status: 'success' };
     const insertMock = {
       values: vi.fn().mockReturnValue({
         returning: vi.fn().mockResolvedValue([mockLog])
       })
     };
     (db.insert as any).mockReturnValue(insertMock);

     const input = {
       tenantId: 't1',
       credentialId: 'c1',
       verifierName: 'Verifier',
       verifierIp: '127.0.0.1',
       location: 'US',
       status: 'verified' as const
     };

     const result = await storage.createVerificationLog(input);

     expect(db.insert).toHaveBeenCalledWith(schema.verificationLogs);
     expect(result).toEqual(mockLog);
     // Check if status mapped correctly
     expect(insertMock.values).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success'
     }));
  });
});
