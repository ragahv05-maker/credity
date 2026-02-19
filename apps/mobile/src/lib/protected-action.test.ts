import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as LocalAuthentication from 'expo-local-authentication';
import { requireProtectedAction } from './protected-action';

// Mock expo-local-authentication
vi.mock('expo-local-authentication', () => ({
  hasHardwareAsync: vi.fn(),
  isEnrolledAsync: vi.fn(),
  authenticateAsync: vi.fn(),
}));

describe('requireProtectedAction', () => {
  const promptMessage = 'Please authenticate';

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return true if hardware is not available', async () => {
    vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(false);
    // isEnrolledAsync might not be called, but setting default just in case
    vi.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(true);

    const result = await requireProtectedAction(promptMessage);

    expect(result).toBe(true);
    expect(LocalAuthentication.hasHardwareAsync).toHaveBeenCalled();
  });

  it('should return true if user is not enrolled', async () => {
    vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(true);
    vi.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(false);

    const result = await requireProtectedAction(promptMessage);

    expect(result).toBe(true);
    expect(LocalAuthentication.hasHardwareAsync).toHaveBeenCalled();
    expect(LocalAuthentication.isEnrolledAsync).toHaveBeenCalled();
  });

  it('should return true if authentication is successful', async () => {
    vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(true);
    vi.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(true);
    vi.mocked(LocalAuthentication.authenticateAsync).mockResolvedValue({ success: true });

    const result = await requireProtectedAction(promptMessage);

    expect(result).toBe(true);
    expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith({
      promptMessage,
      fallbackLabel: 'Use device passcode',
    });
  });

  it('should return false if authentication fails', async () => {
    vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(true);
    vi.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(true);
    vi.mocked(LocalAuthentication.authenticateAsync).mockResolvedValue({ success: false, error: 'failed' });

    const result = await requireProtectedAction(promptMessage);

    expect(result).toBe(false);
  });

  it('should return false if an error occurs during the process', async () => {
    vi.mocked(LocalAuthentication.hasHardwareAsync).mockRejectedValue(new Error('Hardware check failed'));

    const result = await requireProtectedAction(promptMessage);

    expect(result).toBe(false);
  });

  it('should return false if authentication throws an error', async () => {
    vi.mocked(LocalAuthentication.hasHardwareAsync).mockResolvedValue(true);
    vi.mocked(LocalAuthentication.isEnrolledAsync).mockResolvedValue(true);
    vi.mocked(LocalAuthentication.authenticateAsync).mockRejectedValue(new Error('Authentication error'));

    const result = await requireProtectedAction(promptMessage);

    expect(result).toBe(false);
  });
});
