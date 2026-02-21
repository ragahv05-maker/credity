import * as LocalAuthentication from "expo-local-authentication";

export async function requireProtectedAction(
  promptMessage: string,
): Promise<boolean> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !isEnrolled) {
      return true;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: "Use device passcode",
    });

    return result.success;
  } catch {
    return false;
  }
}
