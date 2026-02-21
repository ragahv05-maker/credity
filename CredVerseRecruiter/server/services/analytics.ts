import { PostHog } from "posthog-node";
import { logger } from "./logger";

/**
 * PostHog Analytics for CredVerse Recruiter
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

export function trackVerification(
  result: "valid" | "invalid" | "revoked" | "suspicious",
  method: "jwt" | "qr" | "upload",
  userId?: string,
): void {
  trackEvent("credential_verified", userId, { result, method });
}

export function trackBulkVerification(
  userId: string,
  count: number,
  validCount: number,
  invalidCount: number,
): void {
  trackEvent("bulk_verification_completed", userId, {
    count,
    validCount,
    invalidCount,
  });
}

export function trackFraudDetected(
  credentialId: string,
  fraudType: string,
  riskScore: number,
): void {
  trackEvent("fraud_detected", undefined, {
    credentialId,
    fraudType,
    riskScore,
  });
}

export async function flushAnalytics(): Promise<void> {
  if (!posthog) return;
  await posthog.shutdown();
}

export function isAnalyticsEnabled(): boolean {
  return posthog !== null;
}
