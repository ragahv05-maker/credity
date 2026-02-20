import * as SecureStore from 'expo-secure-store';
import type { AppRole } from '../types';

function keyFor(role: AppRole): string {
  return `credverse_${role}_refresh_token`;
}

export async function storeRefreshToken(role: AppRole, token: string): Promise<void> {
  const key = keyFor(role);
  try {
    await SecureStore.setItemAsync(key, token);
    return;
  } catch {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, token);
    }
  }
}

export async function getRefreshToken(role: AppRole): Promise<string | null> {
  const key = keyFor(role);
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
    return null;
  }
}

export async function clearRefreshToken(role: AppRole): Promise<void> {
  const key = keyFor(role);
  try {
    await SecureStore.deleteItemAsync(key);
    return;
  } catch {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  }
}
