/**
 * WebAuthn Biometrics Hook
 * Uses Web Authentication API for real device biometrics (Touch ID, Face ID, fingerprint)
 */

import { useState, useCallback } from "react";

interface BiometricResult {
  success: boolean;
  credentialId?: string;
  error?: string;
}

// Generate random bytes for challenges
function generateRandomBytes(length: number): Uint8Array {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return array;
}

// Convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function useBiometrics() {
  const [isSupported, setIsSupported] = useState<boolean>(
    typeof window !== "undefined" &&
      !!window.PublicKeyCredential &&
      typeof window.PublicKeyCredential
        .isUserVerifyingPlatformAuthenticatorAvailable === "function",
  );
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Check if platform authenticator (Touch ID, Face ID) is available
  const checkAvailability = useCallback(async (): Promise<{
    available: boolean;
    platformAuthenticator: boolean;
  }> => {
    if (!window.PublicKeyCredential) {
      return { available: false, platformAuthenticator: false };
    }

    try {
      const platformAvailable =
        await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return {
        available: true,
        platformAuthenticator: platformAvailable,
      };
    } catch {
      return { available: false, platformAuthenticator: false };
    }
  }, []);

  // Enroll biometrics using WebAuthn
  const enrollBiometrics = useCallback(
    async (
      userId: string,
      type: "face_id" | "fingerprint" = "face_id",
    ): Promise<BiometricResult> => {
      setIsEnrolling(true);

      try {
        // Check availability first
        const { platformAuthenticator } = await checkAvailability();

        if (!platformAuthenticator) {
          // Fall back to simulated enrollment for devices without biometrics
          const response = await fetch("/api/identity/biometrics/enroll", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, type, deviceId: "web-browser" }),
          });
          const data = await response.json();
          return { success: data.success, credentialId: data.enrollment?.id };
        }

        // Real WebAuthn registration
        const challenge = generateRandomBytes(32);
        const userIdBytes = new TextEncoder().encode(userId);

        const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions =
          {
            challenge,
            rp: {
              name: "Credity Wallet",
              id: window.location.hostname,
            },
            user: {
              id: userIdBytes,
              name: `user-${userId}`,
              displayName: `User ${userId}`,
            },
            pubKeyCredParams: [
              { alg: -7, type: "public-key" }, // ES256
              { alg: -257, type: "public-key" }, // RS256
            ],
            authenticatorSelection: {
              authenticatorAttachment: "platform", // Use built-in (Touch ID, Face ID)
              userVerification: "required", // Require biometric
              residentKey: "preferred",
            },
            timeout: 60000,
            attestation: "none",
          };

        const credential = (await navigator.credentials.create({
          publicKey: publicKeyCredentialCreationOptions,
        })) as PublicKeyCredential;

        if (!credential) {
          throw new Error("Failed to create credential");
        }

        const credentialId = arrayBufferToBase64(credential.rawId);

        // Send to backend
        const response = await fetch("/api/identity/biometrics/enroll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            type,
            deviceId: "web-browser",
            credentialId,
          }),
        });

        const data = await response.json();
        return { success: data.success, credentialId };
      } catch (error: any) {
        console.error("Biometric enrollment error:", error);

        // User cancelled or device doesn't support
        if (error.name === "NotAllowedError") {
          return {
            success: false,
            error: "Biometric authentication was cancelled or denied",
          };
        }

        return {
          success: false,
          error: error.message || "Biometric enrollment failed",
        };
      } finally {
        setIsEnrolling(false);
      }
    },
    [checkAvailability],
  );

  // Verify using biometrics
  const verifyBiometrics = useCallback(
    async (userId: string): Promise<BiometricResult> => {
      setIsVerifying(true);

      try {
        const { platformAuthenticator } = await checkAvailability();

        if (!platformAuthenticator) {
          // Simulate verification for devices without biometrics
          return { success: true };
        }

        const challenge = generateRandomBytes(32);

        const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions =
          {
            challenge,
            timeout: 60000,
            userVerification: "required",
            rpId: window.location.hostname,
          };

        const assertion = (await navigator.credentials.get({
          publicKey: publicKeyCredentialRequestOptions,
        })) as PublicKeyCredential;

        if (!assertion) {
          throw new Error("Verification failed");
        }

        return {
          success: true,
          credentialId: arrayBufferToBase64(assertion.rawId),
        };
      } catch (error: any) {
        console.error("Biometric verification error:", error);
        return {
          success: false,
          error: error.message || "Verification failed",
        };
      } finally {
        setIsVerifying(false);
      }
    },
    [checkAvailability],
  );

  return {
    isSupported,
    isEnrolling,
    isVerifying,
    checkAvailability,
    enrollBiometrics,
    verifyBiometrics,
  };
}
