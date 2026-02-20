import { Request, Response, NextFunction } from 'express';
import * as billingService from '../services/billing-service';

/**
 * Usage gate middleware for metered API endpoints.
 *
 * Applied to POST /api/reputation/events and GET /api/reputation/score.
 *
 * If the user is NOT on a paid plan AND has exceeded 100 calls this month,
 * returns HTTP 402 with an upgrade prompt.
 * Otherwise, tracks the API call and calls next().
 */
export function usageGateMiddleware(req: Request, res: Response, next: NextFunction): void {
  const userId = Number(req.user?.userId || req.query.userId);

  // If no userId can be determined, let the route handler deal with auth
  if (!userId || !Number.isFinite(userId) || userId <= 0) {
    next();
    return;
  }

  // Run the async checks without blocking the middleware signature
  (async () => {
    try {
      const hasPaid = await billingService.hasAnyActivePlan(userId);

      if (!hasPaid) {
        const withinFree = await billingService.isWithinFreeTier(userId);
        if (!withinFree) {
          res.status(402).json({
            error: 'Free tier limit reached. Upgrade to continue.',
            upgradeUrl: '/billing/plans',
          });
          return;
        }
      }

      // Track the API call (non-blocking after response)
      billingService.trackApiCall(userId, req.path).catch((err) => {
        console.error('[UsageTracker] Failed to track API call:', err);
      });

      next();
    } catch (err) {
      console.error('[UsageTracker] Middleware error:', err);
      // On error, allow the request through rather than blocking
      next();
    }
  })();
}
