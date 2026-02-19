import * as SecureStore from 'expo-secure-store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearRefreshToken, getRefreshToken, storeRefreshToken } from './token-vault';

vi.mock('expo-secure-store', () => ({
  setItemAsync: vi.fn(),
  getItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));

describe('token-vault', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stores refresh token for holder', async () => {
    await storeRefreshToken('holder', 'holder-refresh-token');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('credverse:holder:refresh-token', 'holder-refresh-token');
  });

  it('stores refresh token for issuer', async () => {
    await storeRefreshToken('issuer', 'issuer-refresh-token');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('credverse:issuer:refresh-token', 'issuer-refresh-token');
  });

  it('retrieves refresh token for holder', async () => {
    vi.mocked(SecureStore.getItemAsync).mockResolvedValue('holder-refresh-token');
    const token = await getRefreshToken('holder');
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith('credverse:holder:refresh-token');
    expect(token).toBe('holder-refresh-token');
  });

  it('retrieves null if token does not exist', async () => {
    vi.mocked(SecureStore.getItemAsync).mockResolvedValue(null);
    const token = await getRefreshToken('recruiter');
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith('credverse:recruiter:refresh-token');
    expect(token).toBeNull();
  });

  it('clears refresh token for issuer', async () => {
    await clearRefreshToken('issuer');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('credverse:issuer:refresh-token');
  });
});
