import type { AppRole } from '../../types';
import { useSessionStore } from '../../store/session-store';
import { clearRefreshToken, getRefreshToken, storeRefreshToken } from '../token-vault';

export const BASE_URL = (process.env.EXPO_PUBLIC_GATEWAY_URL || 'http://localhost:5173').replace(/\/$/, '');

export const ROLE_PREFIX: Record<AppRole, string> = {
  holder: '/api/mobile/wallet',
  issuer: '/api/mobile/issuer',
  recruiter: '/api/mobile/recruiter',
};

export const AUTH_PREFIX: Record<AppRole, string> = {
  holder: 'v1/auth',
  issuer: 'v1/auth',
  recruiter: 'auth',
};

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
  skipAuth?: boolean;
  retryOnAuthFailure?: boolean;
  idempotencyKey?: string;
  headers?: Record<string, string>;
}

export function buildUrl(role: AppRole, path: string): string {
  const normalizedPath = path.replace(/^\/+/, '');
  return `${BASE_URL}${ROLE_PREFIX[role]}/${normalizedPath}`;
}

export async function parseResponse(response: Response): Promise<any> {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  const text = await response.text();
  return text ? { message: text } : {};
}

export async function refreshAccessToken(role: AppRole): Promise<string | null> {
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
