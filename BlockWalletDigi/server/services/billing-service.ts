import crypto from 'crypto';

// ── Plan configuration ──────────────────────────────────────────────────────────

export const PLANS = {
  safedate_premium: { price: 14900, currency: 'INR', interval: 'monthly', name: 'SafeDate Premium' },
  workscore_pro:    { price: 49900, currency: 'INR', interval: 'yearly',  name: 'WorkScore Pro' },
  gig_pro:          { price:  9900, currency: 'INR', interval: 'monthly', name: 'Gig Pro' },
} as const;

export type PlanKey = keyof typeof PLANS;

const FREE_TIER_MONTHLY_LIMIT = 100;

// ── In-memory storage (mirrors DB tables from schema.ts) ────────────────────────

interface SubscriptionRecord {
  id: number;
  userId: number;
  plan: string;
  status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  razorpaySubscriptionId: string | null;
  razorpayCustomerId: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ApiUsageRecord {
  id: number;
  userId: number | null;
  platformApiKey: string | null;
  endpoint: string;
  month: string; // "2026-02"
  count: number;
  lastRecordedAt: Date;
}

const subscriptionStore = new Map<number, SubscriptionRecord>(); // key = id
const apiUsageStore = new Map<string, ApiUsageRecord>();          // key = `${userId}:${month}`
let nextSubId = 1;
let nextUsageId = 1;

// ── Razorpay client helper ──────────────────────────────────────────────────────

function getRazorpayCredentials(): { keyId: string; keySecret: string } | null {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret };
}

function assertRazorpayConfigured(): { keyId: string; keySecret: string } {
  const creds = getRazorpayCredentials();
  if (!creds) {
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      throw new Error('[Billing] RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required in production');
    }
    console.warn('[Billing] Razorpay not configured — returning mock data in development');
    return { keyId: 'rzp_test_mock', keySecret: 'mock_secret' };
  }
  return creds;
}

async function razorpayRequest<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const { keyId, keySecret } = assertRazorpayConfigured();

  // If mock credentials, return mock responses
  if (keyId === 'rzp_test_mock') {
    return createMockResponse(path, body) as T;
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Razorpay API error ${response.status}: ${errText}`);
  }

  return response.json() as Promise<T>;
}

function createMockResponse(path: string, body?: Record<string, unknown>): unknown {
  if (path.includes('/customers')) {
    return { id: `cust_mock_${Date.now()}`, email: body?.email };
  }
  if (path.includes('/plans')) {
    return { id: `plan_mock_${Date.now()}` };
  }
  if (path.includes('/subscriptions') && !path.includes('/cancel')) {
    return {
      id: `sub_mock_${Date.now()}`,
      short_url: `https://rzp.io/i/mock_${Date.now()}`,
      status: 'created',
    };
  }
  if (path.includes('/cancel')) {
    return { id: body?.subscription_id, status: 'cancelled' };
  }
  return { success: true };
}

// ── Current month key ───────────────────────────────────────────────────────────

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// ── Exported functions ──────────────────────────────────────────────────────────

/**
 * Create a Razorpay subscription for user.
 * Returns { subscriptionId, paymentLink }
 */
export async function createSubscription(
  userId: number,
  plan: PlanKey,
  email: string,
): Promise<{ subscriptionId: string; paymentLink: string }> {
  const planConfig = PLANS[plan];
  if (!planConfig) {
    throw new Error(`Invalid plan: ${plan}`);
  }

  // 1. Create or find Razorpay customer
  const customer = await razorpayRequest<{ id: string }>('POST', '/customers', {
    name: `User ${userId}`,
    email,
    notes: { credverse_user_id: String(userId) },
  });

  // 2. Create Razorpay plan
  const rzpPlan = await razorpayRequest<{ id: string }>('POST', '/plans', {
    period: planConfig.interval === 'yearly' ? 'yearly' : 'monthly',
    interval: 1,
    item: {
      name: planConfig.name,
      amount: planConfig.price,
      currency: planConfig.currency,
      description: `${planConfig.name} subscription`,
    },
  });

  // 3. Create subscription
  const subscription = await razorpayRequest<{
    id: string;
    short_url: string;
    status: string;
  }>('POST', '/subscriptions', {
    plan_id: rzpPlan.id,
    customer_id: customer.id,
    total_count: planConfig.interval === 'yearly' ? 5 : 60, // max billing cycles
    notes: { credverse_user_id: String(userId), plan },
  });

  // 4. Store in memory
  const record: SubscriptionRecord = {
    id: nextSubId++,
    userId,
    plan,
    status: 'trialing',
    razorpaySubscriptionId: subscription.id,
    razorpayCustomerId: customer.id,
    currentPeriodStart: new Date(),
    currentPeriodEnd: null,
    cancelledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  subscriptionStore.set(record.id, record);

  return {
    subscriptionId: subscription.id,
    paymentLink: subscription.short_url,
  };
}

/**
 * Handle Razorpay webhook events.
 * Verifies signature, then processes subscription lifecycle events.
 */
export async function handleWebhook(
  payload: string,
  signature: string,
): Promise<void> {
  // Verify webhook signature
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (webhookSecret) {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.warn('[Billing] Invalid webhook signature');
      throw new Error('Invalid webhook signature');
    }
  }

  const event = JSON.parse(payload);
  const eventType: string = event.event;
  const entityPayload = event.payload?.subscription?.entity ?? event.payload?.payment?.entity;

  if (!entityPayload) {
    console.info('[Billing] Webhook event without entity payload, skipping:', eventType);
    return;
  }

  const razorpaySubId: string | undefined = entityPayload.id ?? entityPayload.subscription_id;

  // Find matching subscription in store
  let matchedRecord: SubscriptionRecord | undefined;
  for (const record of subscriptionStore.values()) {
    if (record.razorpaySubscriptionId === razorpaySubId) {
      matchedRecord = record;
      break;
    }
  }

  switch (eventType) {
    case 'subscription.activated':
      if (matchedRecord) {
        matchedRecord.status = 'active';
        matchedRecord.currentPeriodStart = new Date();
        matchedRecord.updatedAt = new Date();
      }
      console.info('[Billing] Subscription activated:', razorpaySubId);
      break;

    case 'subscription.charged':
      if (matchedRecord) {
        matchedRecord.status = 'active';
        matchedRecord.currentPeriodStart = new Date();
        matchedRecord.updatedAt = new Date();
      }
      console.info('[Billing] Subscription charged:', razorpaySubId);
      break;

    case 'subscription.pending':
    case 'payment.failed':
      if (matchedRecord) {
        matchedRecord.status = 'past_due';
        matchedRecord.updatedAt = new Date();
      }
      console.warn('[Billing] Payment failed for subscription:', razorpaySubId);
      break;

    case 'subscription.halted':
    case 'subscription.cancelled':
      if (matchedRecord) {
        matchedRecord.status = 'cancelled';
        matchedRecord.cancelledAt = new Date();
        matchedRecord.updatedAt = new Date();
      }
      console.info('[Billing] Subscription cancelled:', razorpaySubId);
      break;

    default:
      console.info('[Billing] Unhandled webhook event type:', eventType);
  }
}

/**
 * Check if user has an active subscription for a given plan.
 */
export async function hasActivePlan(userId: number, plan: PlanKey): Promise<boolean> {
  for (const record of subscriptionStore.values()) {
    if (record.userId === userId && record.plan === plan && record.status === 'active') {
      return true;
    }
  }
  return false;
}

/**
 * Check if user has ANY active paid subscription.
 */
export async function hasAnyActivePlan(userId: number): Promise<boolean> {
  for (const record of subscriptionStore.values()) {
    if (record.userId === userId && record.status === 'active') {
      return true;
    }
  }
  return false;
}

/**
 * Get the user's active subscription (if any).
 */
export async function getActiveSubscription(userId: number): Promise<SubscriptionRecord | null> {
  for (const record of subscriptionStore.values()) {
    if (record.userId === userId && record.status === 'active') {
      return record;
    }
  }
  return null;
}

/**
 * Cancel the user's active subscription.
 */
export async function cancelSubscription(userId: number): Promise<void> {
  const sub = await getActiveSubscription(userId);
  if (!sub) {
    throw new Error('No active subscription found');
  }

  // Cancel on Razorpay if configured
  if (sub.razorpaySubscriptionId && getRazorpayCredentials()) {
    await razorpayRequest('POST', `/subscriptions/${sub.razorpaySubscriptionId}/cancel`, {
      cancel_at_cycle_end: 1, // cancel at end of current billing cycle
    });
  }

  sub.status = 'cancelled';
  sub.cancelledAt = new Date();
  sub.updatedAt = new Date();
}

/**
 * Increment API usage counter for metering.
 */
export async function trackApiCall(userId: number, endpoint: string): Promise<void> {
  const month = currentMonth();
  const key = `${userId}:${month}`;

  const existing = apiUsageStore.get(key);
  if (existing) {
    existing.count += 1;
    existing.lastRecordedAt = new Date();
  } else {
    apiUsageStore.set(key, {
      id: nextUsageId++,
      userId,
      platformApiKey: null,
      endpoint,
      month,
      count: 1,
      lastRecordedAt: new Date(),
    });
  }
}

/**
 * Get monthly usage count for user.
 */
export async function getMonthlyUsage(userId: number): Promise<number> {
  const month = currentMonth();
  const key = `${userId}:${month}`;
  const record = apiUsageStore.get(key);
  return record?.count ?? 0;
}

/**
 * Free tier gate: returns true if user is within free 100/month limit.
 */
export async function isWithinFreeTier(userId: number): Promise<boolean> {
  const usage = await getMonthlyUsage(userId);
  return usage < FREE_TIER_MONTHLY_LIMIT;
}
