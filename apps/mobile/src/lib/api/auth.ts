import type { AppRole } from '../../types';
import { useSessionStore } from '../../store/session-store';
import { clearRefreshToken, storeRefreshToken } from '../token-vault';
import { AUTH_PREFIX, requestRole } from './core';

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
