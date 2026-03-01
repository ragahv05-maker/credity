import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { useSessionStore } from '../store/session-store';
import {
  exportIssuerAuditLog,
  exportRecruiterAuditLog,
  getHolderConsents,
  getIssuerDeadLetterEntries,
  replayIssuerDeadLetterEntry,
  submitHolderDataDelete,
  submitHolderDataExport,
  requestRole,
} from './api-client';
import * as SecureStore from 'expo-secure-store';

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(async () => null),
  setItemAsync: vi.fn(async () => undefined),
  deleteItemAsync: vi.fn(async () => undefined),
}));

type FetchCall = {
  input: string;
  init?: RequestInit;
};

const fetchCalls: FetchCall[] = [];

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

// Default fetch handler for the suite
const defaultFetchHandler = async (input: RequestInfo | URL, init?: RequestInit) => {
  const inputString = String(input);
  fetchCalls.push({ input: inputString, init });

  if (inputString.includes('/v1/queue/dead-letter') && init?.method === 'POST') {
    return jsonResponse({ success: true, jobId: 'job-123' }, 202);
  }
  if (inputString.includes('/v1/queue/dead-letter')) {
    return jsonResponse({ entries: [{ id: 'entry-1' }] });
  }
  if (inputString.includes('/v1/compliance/audit-log/export')) {
    return jsonResponse({ integrity: { valid: true }, count: 2, events: [] });
  }
  if (inputString.includes('/compliance/consents')) {
    return jsonResponse({ consents: [{ id: 'consent-1' }] });
  }
  if (inputString.includes('/compliance/data-requests/export')) {
    return jsonResponse({ id: 'export-1', status: 'completed' }, 202);
  }
  if (inputString.includes('/compliance/data-requests/delete')) {
    return jsonResponse({ id: 'delete-1', status: 'completed' }, 202);
  }

  return jsonResponse({ ok: true });
};

describe('mobile api client route wiring', () => {
  let fetchMock: MockInstance;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_GATEWAY_URL = 'http://localhost:5173';
    process.env.EXPO_PUBLIC_ISSUER_API_KEY = 'test-issuer-key';
    useSessionStore.getState().clearAll();
    useSessionStore.getState().setSession('holder', { accessToken: 'holder-token' });
    useSessionStore.getState().setSession('issuer', { accessToken: 'issuer-token' });
    useSessionStore.getState().setSession('recruiter', { accessToken: 'recruiter-token' });
    fetchCalls.length = 0;

    // Use spyOn instead of overwriting global.fetch directly
    // This allows us to use mockImplementation per test safely
    fetchMock = vi.spyOn(global, 'fetch').mockImplementation(defaultFetchHandler as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('hits issuer queue dead-letter list and replay via mobile proxy', async () => {
    const entries = await getIssuerDeadLetterEntries(5);
    expect(entries).toHaveLength(1);
    expect(fetchCalls[0]?.input).toContain('/api/mobile/issuer/v1/queue/dead-letter?limit=5');

    await replayIssuerDeadLetterEntry('entry-1');
    expect(fetchCalls[1]?.input).toContain('/api/mobile/issuer/v1/queue/dead-letter/entry-1/replay');
    expect(fetchCalls[1]?.init?.method).toBe('POST');
    const replayHeaders = fetchCalls[1]?.init?.headers as Record<string, string>;
    expect(replayHeaders['Idempotency-Key'] || replayHeaders['idempotency-key']).toBeTruthy();
  });

  it('hits compliance exports for issuer and recruiter via mobile proxy', async () => {
    const issuerAudit = await exportIssuerAuditLog('json');
    expect(issuerAudit.integrity.valid).toBe(true);
    expect(fetchCalls[0]?.input).toContain('/api/mobile/issuer/v1/compliance/audit-log/export?format=json');

    const recruiterAudit = await exportRecruiterAuditLog('ndjson');
    expect(recruiterAudit.integrity.valid).toBe(true);
    expect(fetchCalls[1]?.input).toContain('/api/mobile/recruiter/v1/compliance/audit-log/export?format=ndjson');
  });

  it('hits holder compliance endpoints via mobile proxy', async () => {
    const consents = await getHolderConsents(7);
    expect(consents).toHaveLength(1);
    expect(fetchCalls[0]?.input).toContain('/api/mobile/wallet/v1/compliance/consents?userId=7');

    await submitHolderDataExport(7, 'test_export');
    expect(fetchCalls[1]?.input).toContain('/api/mobile/wallet/v1/compliance/data-requests/export');
    expect(fetchCalls[1]?.init?.method).toBe('POST');

    await submitHolderDataDelete(7, 'test_delete');
    expect(fetchCalls[2]?.input).toContain('/api/mobile/wallet/v1/compliance/data-requests/delete');
    expect(fetchCalls[2]?.init?.method).toBe('POST');
  });

  describe('requestRole logic', () => {
    it('adds authentication headers when token is present', async () => {
      useSessionStore.getState().setSession('holder', { accessToken: 'test-token' });
      await requestRole('holder', 'test-path');

      const headers = fetchCalls[fetchCalls.length - 1].init?.headers as Record<string, string>;
      expect(headers['Authorization']).toBe('Bearer test-token');
    });

    it('adds X-API-Key for issuer role', async () => {
      process.env.EXPO_PUBLIC_ISSUER_API_KEY = 'test-api-key';
      await requestRole('issuer', 'test-path');

      const headers = fetchCalls[fetchCalls.length - 1].init?.headers as Record<string, string>;
      expect(headers['X-API-Key']).toBe('test-api-key');
    });

    it('adds Idempotency-Key for mutation methods', async () => {
      await requestRole('holder', 'test-path', { method: 'POST' });
      const headers = fetchCalls[fetchCalls.length - 1].init?.headers as Record<string, string>;
      expect(headers['Idempotency-Key']).toBeDefined();
    });

    it('does not add Idempotency-Key for GET', async () => {
      await requestRole('holder', 'test-path', { method: 'GET' });
      const headers = fetchCalls[fetchCalls.length - 1].init?.headers as Record<string, string>;
      expect(headers['Idempotency-Key']).toBeUndefined();
    });

    it('retries on 401 auth failure and updates session', async () => {
      useSessionStore.getState().setSession('holder', { accessToken: 'expired-token' });
      vi.mocked(SecureStore.getItemAsync).mockResolvedValue('valid-refresh-token');

      // Override fetch for this specific test sequence using the spy
      fetchMock
        .mockImplementationOnce(async () => jsonResponse({ error: 'Unauthorized' }, 401)) // 1. Initial Call -> 401
        .mockImplementationOnce(async (input: RequestInfo | URL) => { // 2. Refresh Call
          if (String(input).includes('/refresh')) {
            return jsonResponse({
              tokens: { accessToken: 'new-access-token', refreshToken: 'new-refresh-token' }
            });
          }
          return jsonResponse({ error: 'Unexpected call' }, 500);
        })
        .mockImplementationOnce(async () => jsonResponse({ success: true })); // 3. Retry Call -> 200

      const result = await requestRole('holder', 'protected-resource');

      expect(result).toEqual({ success: true });
      expect(useSessionStore.getState().sessions.holder.accessToken).toBe('new-access-token');

      // Verify SecureStore update
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        expect.stringContaining('refresh_token'),
        'new-refresh-token'
      );
    });

    it('fails if refresh token is invalid (session cleared)', async () => {
      useSessionStore.getState().setSession('holder', { accessToken: 'expired-token' });
      vi.mocked(SecureStore.getItemAsync).mockResolvedValue('invalid-refresh-token');

      fetchMock
        .mockImplementationOnce(async () => jsonResponse({ error: 'Unauthorized' }, 401))
        .mockImplementationOnce(async () => jsonResponse({ error: 'Invalid refresh token' }, 401));

      await expect(requestRole('holder', 'protected-resource')).rejects.toThrow();

      // Session should be cleared
      expect(useSessionStore.getState().sessions.holder.accessToken).toBeNull();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
    });
  });
});
