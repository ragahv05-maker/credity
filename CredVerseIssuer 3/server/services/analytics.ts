import { PostHog } from "posthog-node";
import { logger } from "./logger";

/**
 * PostHog Analytics Service for CredVerse
 * Tracks user behavior and business events
 */

const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY;
const POSTHOG_HOST = process.env.POSTHOG_HOST || "https://app.posthog.com";

let posthog: PostHog | null = null;

/**
 * Initialize PostHog client
 */
export function initAnalytics(): void {
  if (!POSTHOG_API_KEY) {
    logger.info("[Analytics] PostHog not configured, analytics disabled");
    return;
  }

  posthog = new PostHog(POSTHOG_API_KEY, {
    host: POSTHOG_HOST,
    flushAt: 20,
    flushInterval: 10000,
  });

  logger.info("[Analytics] PostHog initialized");
}

/**
 * Identify a user with traits
 */
export function identifyUser(
  userId: string,
  traits?: Record<string, any>,
): void {
  if (!posthog) return;

  posthog.identify({
    distinctId: userId,
    properties: traits,
  });
}

/**
 * Track an event
 */
export function trackEvent(
  event: string,
  userId?: string,
  properties?: Record<string, any>,
): void {
  if (!posthog) {
    // Still log events even without PostHog
    logger.info(
      { type: "analytics", event, userId, ...properties },
      `[Analytics] ${event}`,
    );
    return;
  }

  posthog.capture({
    distinctId: userId || "anonymous",
    event,
    properties,
  });
}

/**
 * Track user login
 */
export function trackLogin(
  userId: string,
  method: "password" | "2fa" | "oauth",
): void {
  trackEvent("user_login", userId, { method });
  identifyUser(userId, { lastLogin: new Date().toISOString() });
}

/**
 * Track credential issuance
 */
export function trackCredentialIssued(
  userId: string,
  templateId: string,
  credentialId: string,
  recipientCount: number = 1,
): void {
  trackEvent("credential_issued", userId, {
    templateId,
    credentialId,
    recipientCount,
  });
}

/**
 * Track bulk issuance started
 */
export function trackBulkIssuanceStarted(
  userId: string,
  templateId: string,
  count: number,
  queued: boolean,
): void {
  trackEvent("bulk_issuance_started", userId, {
    templateId,
    count,
    queued,
  });
}

/**
 * Track credential verification
 */
export function trackCredentialVerified(
  result: "valid" | "invalid" | "revoked",
  method: "jwt" | "qr" | "upload",
  verifierId?: string,
): void {
  trackEvent("credential_verified", verifierId, {
    result,
    method,
  });
}

/**
 * Track credential revocation
 */
export function trackCredentialRevoked(
  userId: string,
  credentialId: string,
  reason: string,
): void {
  trackEvent("credential_revoked", userId, {
    credentialId,
    reason,
  });
}

/**
 * Track 2FA setup
 */
export function track2FAEnabled(userId: string): void {
  trackEvent("2fa_enabled", userId);
  identifyUser(userId, { twoFactorEnabled: true });
}

/**
 * Flush pending events (call on shutdown)
 */
export async function flushAnalytics(): Promise<void> {
  if (!posthog) return;
  await posthog.shutdown();
}

/**
 * Check if analytics is enabled
 */
export function isAnalyticsEnabled(): boolean {
  return posthog !== null;
}
