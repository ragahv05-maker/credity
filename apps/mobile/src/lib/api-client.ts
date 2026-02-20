import type { AppRole } from '../types';
import { useSessionStore } from '../store/session-store';
import { clearRefreshToken, getRefreshToken, storeRefreshToken } from './token-vault';

const BASE_URL = (process.env.EXPO_PUBLIC_GATEWAY_URL || 'http://localhost:5173').replace(/\/$/, '');

const ROLE_PREFIX: Record<AppRole, string> = {
  holder: '/api/mobile/wallet',
  issuer: '/api/mobile/issuer',
  recruiter: '/api/mobile/recruiter',
};

const AUTH_PREFIX: Record<AppRole, string> = {
  holder: 'v1/auth',
  issuer: 'v1/auth',
  recruiter: 'auth',
};

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
  skipAuth?: boolean;
  retryOnAuthFailure?: boolean;
  idempotencyKey?: string;
  headers?: Record<string, string>;
}

function buildUrl(role: AppRole, path: string): string {
  const normalizedPath = path.replace(/^\/+/, '');
  return `${BASE_URL}${ROLE_PREFIX[role]}/${normalizedPath}`;
}

async function parseResponse(response: Response): Promise<any> {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  const text = await response.text();
  return text ? { message: text } : {};
}

async function refreshAccessToken(role: AppRole): Promise<string | null> {
  const refreshToken = await getRefreshToken(role);
  if (!refreshToken) {
    return null;
  }

  const response = await fetch(buildUrl(role, `${AUTH_PREFIX[role]}/refresh`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    await clearRefreshToken(role);
    useSessionStore.getState().clearSession(role);
    return null;
  }

  const data = await response.json();
  const accessToken = data?.tokens?.accessToken as string | undefined;
  const nextRefreshToken = data?.tokens?.refreshToken as string | undefined;

  if (!accessToken) {
    return null;
  }

  useSessionStore.getState().setSession(role, {
    accessToken,
    refreshToken: nextRefreshToken || refreshToken,
  });

  if (nextRefreshToken && nextRefreshToken !== refreshToken) {
    await storeRefreshToken(role, nextRefreshToken);
  }

  return accessToken;
}

export async function restoreRoleSession(role: AppRole): Promise<boolean> {
  const currentAccess = useSessionStore.getState().sessions[role].accessToken;
  if (currentAccess) {
    return true;
  }

  const accessToken = await refreshAccessToken(role);
  if (!accessToken) {
    return false;
  }

  try {
    const profile = await requestRole<any>(role, `${AUTH_PREFIX[role]}/me`, {
      token: accessToken,
      retryOnAuthFailure: false,
    });
    useSessionStore.getState().setSession(role, {
      user: profile || null,
    });
  } catch {
    // Session is restored even if profile call fails; UI can recover with manual refresh.
  }

  return true;
}

function shouldAttachIdempotencyKey(method: RequestOptions['method']): boolean {
  return method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
}

function generateIdempotencyKey(role: AppRole): string {
  return `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function requestRole<T>(
  role: AppRole,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    method = 'GET',
    body,
    token = useSessionStore.getState().sessions[role].accessToken,
    skipAuth = false,
    retryOnAuthFailure = true,
    idempotencyKey,
    headers: extraHeaders = {},
  } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };
  const resolvedIdempotencyKey =
    shouldAttachIdempotencyKey(method) ? idempotencyKey || generateIdempotencyKey(role) : undefined;

  if (role === 'issuer') {
    const issuerApiKey = process.env.EXPO_PUBLIC_ISSUER_API_KEY;
    if (issuerApiKey && !headers['X-API-Key'] && !headers['x-api-key']) {
      headers['X-API-Key'] = issuerApiKey;
    }
  }

  if (!skipAuth && token && !headers.Authorization && !headers.authorization) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (resolvedIdempotencyKey && !headers['Idempotency-Key'] && !headers['idempotency-key']) {
    headers['Idempotency-Key'] = resolvedIdempotencyKey;
  }

  const response = await fetch(buildUrl(role, path), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401 && !skipAuth && retryOnAuthFailure) {
    const nextAccessToken = await refreshAccessToken(role);
    if (nextAccessToken) {
      return requestRole<T>(role, path, {
        ...options,
        token: nextAccessToken,
        retryOnAuthFailure: false,
        idempotencyKey: resolvedIdempotencyKey,
      });
    }
  }

  const payload = await parseResponse(response);
  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || `Request failed with ${response.status}`);
  }

  return payload as T;
}

export async function registerRole(
  role: AppRole,
  input: { username: string; password: string; email?: string; name?: string },
): Promise<void> {
  const data = await requestRole<any>(role, `${AUTH_PREFIX[role]}/register`, {
    method: 'POST',
    body: input,
    skipAuth: true,
    retryOnAuthFailure: false,
  });

  const accessToken = data?.tokens?.accessToken as string | undefined;
  const refreshToken = data?.tokens?.refreshToken as string | undefined;
  if (!accessToken || !refreshToken) {
    throw new Error('Registration succeeded but no tokens were returned');
  }

  await storeRefreshToken(role, refreshToken);
  useSessionStore.getState().setSession(role, {
    accessToken,
    refreshToken,
    user: data?.user || null,
  });
}

export async function loginRole(role: AppRole, username: string, password: string): Promise<void> {
  const data = await requestRole<any>(role, `${AUTH_PREFIX[role]}/login`, {
    method: 'POST',
    body: { username, password },
    skipAuth: true,
    retryOnAuthFailure: false,
  });

  if (data?.requires2FA) {
    throw new Error('2FA-enabled account detected. Mobile 2FA flow is not implemented yet.');
  }

  const accessToken = data?.tokens?.accessToken as string | undefined;
  const refreshToken = data?.tokens?.refreshToken as string | undefined;
  if (!accessToken || !refreshToken) {
    throw new Error('Login succeeded but no tokens were returned');
  }

  await storeRefreshToken(role, refreshToken);
  useSessionStore.getState().setSession(role, {
    accessToken,
    refreshToken,
    user: data?.user || null,
  });
}

export async function logoutRole(role: AppRole): Promise<void> {
  const session = useSessionStore.getState().sessions[role];
  try {
    await requestRole(role, `${AUTH_PREFIX[role]}/logout`, {
      method: 'POST',
      body: { refreshToken: session.refreshToken },
    });
  } finally {
    await clearRefreshToken(role);
    useSessionStore.getState().clearSession(role);
  }
}

export async function getRoleProfile(role: AppRole): Promise<any> {
  return requestRole(role, `${AUTH_PREFIX[role]}/me`);
}

export async function getHolderWalletStatus(): Promise<any> {
  return requestRole('holder', 'v1/wallet/status?userId=1');
}

export async function getHolderReputationScore(): Promise<any> {
  const data = await requestRole<any>('holder', 'v1/reputation/score?userId=1');
  return data?.reputation || data;
}

export async function getHolderSafeDateScore(): Promise<any> {
  const data = await requestRole<any>('holder', 'v1/reputation/safedate?userId=1');
  return data?.safe_date || data;
}

export async function getHolderCredentials(): Promise<any[]> {
  const data = await requestRole<any>('holder', 'v1/wallet/credentials');
  return Array.isArray(data) ? data : data?.credentials || [];
}

export async function getHolderCredential(id: string | number): Promise<any> {
  return requestRole('holder', `v1/wallet/credentials/${id}`);
}

export async function createCredentialShareQr(
  id: string | number,
  input?: { expiryMinutes?: 1 | 5 | 30 | 60; disclosedFields?: string[] },
): Promise<any> {
  return requestRole('holder', `v1/credentials/${id}/qr`, {
    method: 'POST',
    body: {
      expiryMinutes: input?.expiryMinutes ?? 5,
      disclosedFields: input?.disclosedFields ?? [],
    },
  });
}

export async function claimHolderCredentialOffer(url: string): Promise<any> {
  return requestRole('holder', 'v1/wallet/offer/claim', {
    method: 'POST',
    body: { url },
  });
}

export async function getHolderCredentialFields(id: string | number): Promise<{ fields: any[]; categories: any[] }> {
  return requestRole('holder', `v1/wallet/credentials/${id}/fields?userId=1`);
}

export async function createHolderDisclosure(input: {
  credentialId: string | number;
  requestedFields: string[];
  purpose?: string;
  requesterDID?: string;
  expiryMinutes?: number;
}): Promise<any> {
  return requestRole('holder', `v1/credentials/${input.credentialId}/disclose`, {
    method: 'POST',
    body: {
      requestedFields: input.requestedFields,
      purpose: input.purpose || 'recruiter_verification',
      requesterDID: input.requesterDID,
      expiryMinutes: input.expiryMinutes ?? 30,
    },
  });
}

export async function generateHolderProofMetadata(credentialId: string | number): Promise<any> {
  return requestRole('holder', 'v1/wallet/proofs/generate', {
    method: 'POST',
    body: { credentialId: String(credentialId) },
  });
}

export async function getIssuerCredentials(): Promise<any[]> {
  const data = await requestRole<any>('issuer', 'v1/credentials');
  return Array.isArray(data) ? data : data?.credentials || [];
}

export async function issueCredential(input: {
  tenantId: string;
  templateId: string;
  issuerId: string;
  recipient: Record<string, unknown>;
  credentialData: Record<string, unknown>;
}): Promise<any> {
  return requestRole('issuer', 'v1/credentials/issue', {
    method: 'POST',
    body: {
      tenantId: input.tenantId,
      templateId: input.templateId,
      issuerId: input.issuerId,
      recipient: input.recipient,
      credentialData: input.credentialData,
    },
  });
}

const OID4VCI_PRE_AUTH_GRANT = 'urn:ietf:params:oauth:grant-type:pre-authorized_code';

function extractPreAuthorizedCode(offerResponse: any): string | null {
  return offerResponse?.credential_offer?.grants?.[OID4VCI_PRE_AUTH_GRANT]?.['pre-authorized_code'] || null;
}

export async function issueCredentialViaOid4vci(input: {
  tenantId: string;
  templateId: string;
  issuerId: string;
  recipient: Record<string, unknown>;
  credentialData: Record<string, unknown>;
  format?: 'sd-jwt-vc' | 'vc+jwt';
}): Promise<{
  credentialId: string | null;
  format: string | null;
  credential: string | null;
  status: any;
}> {
  let stage: 'offer' | 'token' | 'credential' = 'offer';
  try {
    const offerResponse = await requestRole<any>('issuer', 'v1/oid4vci/credential-offers', {
      method: 'POST',
      body: {
        tenantId: input.tenantId,
        templateId: input.templateId,
        issuerId: input.issuerId,
        recipient: input.recipient,
        credentialData: input.credentialData,
        format: input.format || 'sd-jwt-vc',
      },
      retryOnAuthFailure: false,
    });

    const preAuthorizedCode = extractPreAuthorizedCode(offerResponse);
    if (!preAuthorizedCode) {
      throw new Error('offer did not return a pre-authorized code');
    }

    stage = 'token';
    const tokenResponse = await requestRole<any>('issuer', 'v1/oid4vci/token', {
      method: 'POST',
      body: {
        grant_type: OID4VCI_PRE_AUTH_GRANT,
        'pre-authorized_code': preAuthorizedCode,
      },
      skipAuth: true,
      retryOnAuthFailure: false,
    });

    const accessToken = tokenResponse?.access_token as string | undefined;
    if (!accessToken) {
      throw new Error('token endpoint did not return access_token');
    }

    stage = 'credential';
    const credentialResponse = await requestRole<any>('issuer', 'v1/oid4vci/credential', {
      method: 'POST',
      body: {
        format: input.format || 'sd-jwt-vc',
      },
      skipAuth: true,
      retryOnAuthFailure: false,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return {
      credentialId: credentialResponse?.credential_id || null,
      format: credentialResponse?.format || null,
      credential: credentialResponse?.credential || null,
      status: credentialResponse?.status || null,
    };
  } catch (error: any) {
    const message = error?.message || 'unknown OID4VCI error';
    throw new Error(`[oid4vci:${stage}] ${message}`);
  }
}

export async function getRecruiterVerifications(): Promise<any[]> {
  try {
    const data = await requestRole<any>('recruiter', 'v1/verifications');
    return Array.isArray(data) ? data : data?.items || data?.records || [];
  } catch {
    const legacyData = await requestRole<any>('recruiter', 'verifications');
    return Array.isArray(legacyData) ? legacyData : legacyData?.records || [];
  }
}

export async function verifyRecruiterInstant(payload: {
  jwt?: string;
  qrData?: string;
  credential?: Record<string, unknown>;
}): Promise<any> {
  return requestRole('recruiter', 'v1/verifications/instant', {
    method: 'POST',
    body: payload,
  });
}

export async function getRecruiterVerificationDetail(id: string): Promise<any> {
  return requestRole('recruiter', `v1/verifications/${id}`);
}

export async function getHolderConsents(userId = 1): Promise<any[]> {
  const data = await requestRole<any>('holder', `v1/compliance/consents?userId=${encodeURIComponent(String(userId))}`);
  return Array.isArray(data) ? data : data?.consents || [];
}

export async function getHolderDataRequests(userId = 1): Promise<any[]> {
  const data = await requestRole<any>('holder', `v1/compliance/data-requests?userId=${encodeURIComponent(String(userId))}`);
  return Array.isArray(data) ? data : data?.requests || [];
}

export async function getHolderCertInIncidents(): Promise<any[]> {
  const data = await requestRole<any>('holder', 'v1/compliance/certin/incidents');
  return Array.isArray(data) ? data : data?.incidents || [];
}

export async function revokeHolderConsent(consentId: string, userId = 1): Promise<any> {
  return requestRole('holder', `v1/compliance/consents/${encodeURIComponent(consentId)}/revoke`, {
    method: 'POST',
    body: { userId },
  });
}

export async function submitHolderDataExport(userId = 1, reason?: string): Promise<any> {
  return requestRole('holder', 'v1/compliance/data-requests/export', {
    method: 'POST',
    body: {
      userId,
      ...(reason ? { reason } : {}),
    },
  });
}

export async function submitHolderDataDelete(userId = 1, reason?: string): Promise<any> {
  return requestRole('holder', 'v1/compliance/data-requests/delete', {
    method: 'POST',
    body: {
      userId,
      confirm: 'DELETE',
      ...(reason ? { reason } : {}),
    },
  });
}

export async function getIssuerComplianceConsents(): Promise<any[]> {
  const data = await requestRole<any>('issuer', 'v1/compliance/consents');
  return Array.isArray(data) ? data : data?.consents || [];
}

export async function revokeIssuerConsent(consentId: string): Promise<any> {
  return requestRole('issuer', `v1/compliance/consents/${encodeURIComponent(consentId)}/revoke`, {
    method: 'POST',
  });
}

export async function getIssuerDataRequests(): Promise<any[]> {
  const data = await requestRole<any>('issuer', 'v1/compliance/data-requests');
  return Array.isArray(data) ? data : data?.requests || [];
}

export async function getIssuerCertInIncidents(): Promise<any[]> {
  const data = await requestRole<any>('issuer', 'v1/compliance/certin/incidents');
  return Array.isArray(data) ? data : data?.incidents || [];
}

export async function requestIssuerDataExport(subjectId: string, reason?: string): Promise<any> {
  return requestRole('issuer', 'v1/compliance/data-requests/export', {
    method: 'POST',
    body: {
      subject_id: subjectId,
      ...(reason ? { reason } : {}),
    },
  });
}

export async function exportIssuerAuditLog(format: 'json' | 'ndjson' = 'json'): Promise<any> {
  return requestRole<any>('issuer', `v1/compliance/audit-log/export?format=${format}`);
}

export async function getIssuerDeadLetterEntries(limit = 25): Promise<any[]> {
  const data = await requestRole<any>('issuer', `v1/queue/dead-letter?limit=${encodeURIComponent(String(limit))}`);
  return Array.isArray(data) ? data : data?.entries || [];
}

export async function replayIssuerDeadLetterEntry(entryId: string): Promise<any> {
  return requestRole('issuer', `v1/queue/dead-letter/${encodeURIComponent(entryId)}/replay`, {
    method: 'POST',
  });
}

export async function getIssuerQueueStats(): Promise<any> {
  return requestRole('issuer', 'v1/queue/stats');
}

export async function getRecruiterComplianceConsents(): Promise<any[]> {
  const data = await requestRole<any>('recruiter', 'v1/compliance/consents');
  return Array.isArray(data) ? data : data?.consents || [];
}

export async function revokeRecruiterConsent(consentId: string): Promise<any> {
  return requestRole('recruiter', `v1/compliance/consents/${encodeURIComponent(consentId)}/revoke`, {
    method: 'POST',
  });
}

export async function getRecruiterDataRequests(): Promise<any[]> {
  const data = await requestRole<any>('recruiter', 'v1/compliance/data-requests');
  return Array.isArray(data) ? data : data?.requests || [];
}

export async function getRecruiterCertInIncidents(): Promise<any[]> {
  const data = await requestRole<any>('recruiter', 'v1/compliance/certin/incidents');
  return Array.isArray(data) ? data : data?.incidents || [];
}

export async function requestRecruiterDataExport(subjectId: string, reason?: string): Promise<any> {
  return requestRole('recruiter', 'v1/compliance/data-requests/export', {
    method: 'POST',
    body: {
      subject_id: subjectId,
      ...(reason ? { reason } : {}),
    },
  });
}

export async function exportRecruiterAuditLog(format: 'json' | 'ndjson' = 'json'): Promise<any> {
  return requestRole<any>('recruiter', `v1/compliance/audit-log/export?format=${format}`);
}
// ---------------------------------------------------------------------------
// OTP + Password Reset helpers (Agent 1)
// ---------------------------------------------------------------------------

export async function sendEmailOtp(email: string): Promise<void> {
  await requestRole('holder', 'v1/auth/send-email-otp', {
    method: 'POST',
    body: { email },
    skipAuth: true,
    retryOnAuthFailure: false,
  });
}

export async function verifyEmailOtp(email: string, code: string): Promise<void> {
  await requestRole('holder', 'v1/auth/verify-email-otp', {
    method: 'POST',
    body: { email, code },
    skipAuth: true,
    retryOnAuthFailure: false,
  });
}

export async function sendPhoneOtp(phone: string): Promise<void> {
  await requestRole('holder', 'v1/auth/send-phone-otp', {
    method: 'POST',
    body: { phone },
    skipAuth: true,
    retryOnAuthFailure: false,
  });
}

export async function verifyPhoneOtp(phone: string, code: string): Promise<void> {
  await requestRole('holder', 'v1/auth/verify-phone-otp', {
    method: 'POST',
    body: { phone, code },
    skipAuth: true,
    retryOnAuthFailure: false,
  });
}

export async function sendForgotPasswordEmail(email: string): Promise<void> {
  await requestRole('holder', 'v1/auth/forgot-password', {
    method: 'POST',
    body: { email },
    skipAuth: true,
    retryOnAuthFailure: false,
  });
}

export async function resetPassword(email: string, code: string, newPassword: string): Promise<void> {
  await requestRole('holder', 'v1/auth/reset-password', {
    method: 'POST',
    body: { email, code, newPassword },
    skipAuth: true,
    retryOnAuthFailure: false,
  });
}

// ---------------------------------------------------------------------------
// Connections (holder)
// ---------------------------------------------------------------------------

export async function getHolderConnections(): Promise<any[]> {
  const data = await requestRole<any>('holder', 'v1/connections');
  return Array.isArray(data) ? data : data?.connections || [];
}

export async function getPendingConnections(): Promise<any[]> {
  try {
    const data = await requestRole<any>('holder', 'v1/connections/pending');
    return Array.isArray(data) ? data : data?.pending || data?.requests || [];
  } catch {
    const fallback = await requestRole<any>('holder', 'v1/connections/requests');
    return Array.isArray(fallback) ? fallback : fallback?.requests || [];
  }
}

export async function approveConnection(connectionId: string): Promise<any> {
  const encoded = encodeURIComponent(connectionId);
  try {
    return await requestRole('holder', `v1/connections/${encoded}/approve`, {
      method: 'POST',
    });
  } catch {
    return requestRole('holder', `v1/connections/requests/${encoded}/approve`, {
      method: 'POST',
    });
  }
}

export async function denyConnection(connectionId: string): Promise<any> {
  const encoded = encodeURIComponent(connectionId);
  try {
    return await requestRole('holder', `v1/connections/${encoded}/deny`, {
      method: 'POST',
    });
  } catch {
    return requestRole('holder', `v1/connections/requests/${encoded}/deny`, {
      method: 'POST',
    });
  }
}

export async function disconnectConnection(connectionId: string): Promise<any> {
  return requestRole('holder', `v1/connections/${encodeURIComponent(connectionId)}`, {
    method: 'DELETE',
  });
}

// ---------------------------------------------------------------------------
// Liveness (holder)
// ---------------------------------------------------------------------------

export async function startLivenessSession(): Promise<{ sessionId: string; challenges: any[] }> {
  const data = await requestRole<any>('holder', 'v1/identity/liveness/start', {
    method: 'POST',
    body: { userId: '1' },
  });

  const challenges = Array.isArray(data?.challenges)
    ? data.challenges
    : data?.currentChallenge
      ? [data.currentChallenge]
      : [];

  return {
    sessionId: data?.sessionId || data?.session_id || '',
    challenges,
  };
}

export async function submitLivenessChallenge(input: {
  sessionId: string;
  challengeId: string;
  completed: boolean;
}): Promise<any> {
  return requestRole('holder', 'v1/identity/liveness/challenge', {
    method: 'POST',
    body: {
      sessionId: input.sessionId,
      challengeId: input.challengeId,
      completed: input.completed,
    },
  });
}

export async function completeLivenessSession(
  sessionId: string,
): Promise<{ passed: boolean; score: number; message?: string }> {
  try {
    const data = await requestRole<any>('holder', 'v1/identity/liveness/complete', {
      method: 'POST',
      body: {
        sessionId,
        userId: '1',
        passed: true,
      },
    });

    const rawScore = Number(data?.score ?? data?.result?.score ?? data?.result?.confidence ?? 0);
    return {
      passed: Boolean(data?.passed ?? data?.verified ?? data?.success),
      score: Number.isFinite(rawScore) ? Math.max(0, Math.min(100, Math.round(rawScore))) : 0,
      message: data?.message || data?.error,
    };
  } catch {
    const fallback = await requestRole<any>('holder', `v1/identity/liveness/${encodeURIComponent(sessionId)}`);
    const rawScore = Number(fallback?.result?.score ?? fallback?.result?.confidence ?? 0);
    return {
      passed: Boolean(fallback?.success),
      score: Number.isFinite(rawScore) ? Math.max(0, Math.min(100, Math.round(rawScore))) : 0,
      message: fallback?.message || fallback?.error,
    };
  }
}

// ---------------------------------------------------------------------------
// Activity (holder) — H-3
// ---------------------------------------------------------------------------

export async function getHolderActivity(): Promise<Array<{
  id: string;
  title: string;
  description: string;
  status: 'verified' | 'pending' | 'revoked';
  timestamp: string;
}>> {
  const data = await requestRole<any>('holder', 'v1/activity');
  const raw: any[] = Array.isArray(data) ? data : data?.activities || data?.items || [];
  return raw.map((item: any) => ({
    id: String(item.id || Math.random().toString(16).slice(2)),
    title: item.title || item.type || 'Activity',
    description: item.description || item.detail || '',
    status: (item.status === 'revoked' || item.status === 'pending') ? item.status : 'verified',
    timestamp: item.timestamp || item.createdAt || item.created_at || new Date().toISOString(),
  }));
}

// ---------------------------------------------------------------------------
// Credential revoke (holder) — H-5
// ---------------------------------------------------------------------------

export async function revokeCredential(credentialId: string): Promise<void> {
  await requestRole('holder', `v1/wallet/credentials/${encodeURIComponent(credentialId)}/revoke`, {
    method: 'POST',
    body: {},
  });
}

// ---------------------------------------------------------------------------
// Trust score suggestions (holder) — M-6
// ---------------------------------------------------------------------------

export async function getHolderTrustSuggestions(): Promise<{
  quickWins: Array<{ action: string; points: number; category: string }>;
  longTerm: Array<{ action: string; points: number; category: string }>;
  potentialPoints: number;
}> {
  const data = await requestRole<any>('holder', 'v1/trust-score/suggestions');
  return {
    quickWins: Array.isArray(data?.quickWins) ? data.quickWins : [],
    longTerm: Array.isArray(data?.longTerm) ? data.longTerm : [],
    potentialPoints: Number(data?.potentialPoints ?? 0),
  };
}
