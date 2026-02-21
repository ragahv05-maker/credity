import { PostHog } from "posthog-node";
import { logger } from "./logger";

/**
 * PostHog Analytics for CredVerse Wallet
 */

const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY;
const POSTHOG_HOST = process.env.POSTHOG_HOST || "https://app.posthog.com";

let posthog: PostHog | null = null;

export function initAnalytics(): void {
  if (!POSTHOG_API_KEY) {
    logger.info("[Analytics] PostHog not configured");
    return;
  }
  posthog = new PostHog(POSTHOG_API_KEY, {
    host: POSTHOG_HOST,
    flushAt: 20,
    flushInterval: 10000,
  });
  logger.info("[Analytics] PostHog initialized");
}

export function identifyUser(
  userId: string,
  traits?: Record<string, any>,
): void {
  if (!posthog) return;
  posthog.identify({ distinctId: userId, properties: traits });
}

export function trackEvent(
  event: string,
  userId?: string,
  properties?: Record<string, any>,
): void {
  if (!posthog) {
    logger.info(
      { type: "analytics", event, userId, ...properties },
      `[Analytics] ${event}`,
    );
    return;
  }
  posthog.capture({ distinctId: userId || "anonymous", event, properties });
}

export function trackLogin(
  userId: string,
  method: "password" | "passkey" | "biometric",
): void {
  trackEvent("wallet_login", userId, { method });
  identifyUser(userId, { lastLogin: new Date().toISOString() });
}

export function trackCredentialClaimed(
  userId: string,
  credentialId: string,
): void {
  trackEvent("credential_claimed", userId, { credentialId });
}

export function trackCredentialShared(
  userId: string,
  credentialId: string,
  method: "qr" | "link" | "selective",
): void {
  trackEvent("credential_shared", userId, { credentialId, method });
}

export function trackDIDCreated(userId: string, didMethod: string): void {
  trackEvent("did_created", userId, { didMethod });
}

export async function flushAnalytics(): Promise<void> {
  if (!posthog) return;
  await posthog.shutdown();
}

export function isAnalyticsEnabled(): boolean {
  return posthog !== null;
}
