import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../services/auth-service';
import * as billingService from '../services/billing-service';

const router = Router();

// ── Validation schemas ──────────────────────────────────────────────────────────

const subscribeSchema = z.object({
  plan: z.enum(['safedate_premium', 'workscore_pro', 'gig_pro']),
  email: z.string().email().optional(),
});

// ── Routes ──────────────────────────────────────────────────────────────────────

/**
 * GET /billing/plans
 * Returns available subscription plans (public, no auth).
 */
router.get('/billing/plans', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: billingService.PLANS,
  });
});

/**
 * POST /billing/subscribe
 * Create a new subscription for the authenticated user.
 */
router.post('/billing/subscribe', authMiddleware, async (req: Request, res: Response) => {
  try {
    const parsed = subscribeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const userId = Number(req.user?.userId);
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { plan, email } = parsed.data;
    const userEmail = email ?? `user_${userId}@credverse.in`;

    const result = await billingService.createSubscription(userId, plan, userEmail);

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[Billing] Subscribe error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to create subscription',
    });
  }
});

/**
 * POST /billing/webhook
 * Razorpay webhook handler — no auth, verify signature instead.
 * Must receive raw body (configured externally or via middleware).
 */
router.post('/billing/webhook', async (req: Request, res: Response) => {
  try {
    // req.body may be a Buffer if express.raw() was applied, or a parsed object
    const rawBody = typeof req.body === 'string'
      ? req.body
      : Buffer.isBuffer(req.body)
        ? req.body.toString('utf-8')
        : JSON.stringify(req.body);

    const signature = String(req.headers['x-razorpay-signature'] ?? '');

    await billingService.handleWebhook(rawBody, signature);

    // Razorpay expects 200 regardless of internal processing result
    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('[Billing] Webhook error:', error);
    // Still return 200 to Razorpay to prevent retries
    return res.status(200).json({ received: true });
  }
});

/**
 * GET /billing/subscription
 * Returns the current user's active subscription.
 */
router.get('/billing/subscription', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = Number(req.user?.userId);
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const subscription = await billingService.getActiveSubscription(userId);

    return res.json({
      success: true,
      data: subscription
        ? {
            plan: subscription.plan,
            status: subscription.status,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd,
            createdAt: subscription.createdAt,
          }
        : null,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || 'Failed to fetch subscription',
    });
  }
});

/**
 * POST /billing/cancel
 * Cancel the current user's active subscription.
 */
router.post('/billing/cancel', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = Number(req.user?.userId);
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    await billingService.cancelSubscription(userId);

    return res.json({ success: true });
  } catch (error: any) {
    return res.status(400).json({
      error: error?.message || 'Failed to cancel subscription',
    });
  }
});

/**
 * GET /billing/usage
 * Returns monthly API usage count for the authenticated user.
 */
router.get('/billing/usage', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = Number(req.user?.userId);
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const count = await billingService.getMonthlyUsage(userId);
    const isWithinFree = await billingService.isWithinFreeTier(userId);

    return res.json({
      success: true,
      data: {
        monthlyUsage: count,
        freeTierLimit: 100,
        isWithinFreeTier: isWithinFree,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || 'Failed to fetch usage',
    });
  }
});

export default router;
