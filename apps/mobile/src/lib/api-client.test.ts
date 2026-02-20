import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSessionStore } from '../store/session-store';
import {
  exportIssuerAuditLog,
  exportRecruiterAuditLog,
  getHolderConsents,
  getIssuerDeadLetterEntries,
  loginWithAppleIdentityToken,
  replayIssuerDeadLetterEntry,
  submitHolderDataDelete,
  submitHolderDataExport,
} from './api-client';

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

describe('mobile api client route wiring', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_GATEWAY_URL = 'http://localhost:5173';
    process.env.EXPO_PUBLIC_ISSUER_API_KEY = 'test-issuer-key';
    useSessionStore.getState().clearAll();
    useSessionStore.getState().setSession('holder', { accessToken: 'holder-token' });
    useSessionStore.getState().setSession('issuer', { accessToken: 'issuer-token' });
    useSessionStore.getState().setSession('recruiter', { accessToken: 'recruiter-token' });
    fetchCalls.length = 0;

    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
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
      if (inputString.includes('/v1/auth/apple') && init?.method === 'POST') {
        return jsonResponse({
          success: true,
          user: { id: 5, username: 'apple.user@example.com' },
          tokens: {
            accessToken: 'apple-access-token',
            refreshToken: 'apple-refresh-token',
          },
        });
      }

      return jsonResponse({ ok: true });
    }) as unknown as typeof fetch;
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

  it('exchanges Apple identity token via holder auth endpoint and stores session', async () => {
    await loginWithAppleIdentityToken('apple-id-token');

    expect(fetchCalls[0]?.input).toContain('/api/mobile/wallet/v1/auth/apple');
    expect(fetchCalls[0]?.init?.method).toBe('POST');
    const body = JSON.parse(String(fetchCalls[0]?.init?.body || '{}'));
    expect(body.identityToken).toBe('apple-id-token');

    const holderSession = useSessionStore.getState().sessions.holder;
    expect(holderSession.accessToken).toBe('apple-access-token');
    expect(holderSession.refreshToken).toBe('apple-refresh-token');
  });
});
