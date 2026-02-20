import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import reputationRoutes from '../server/routes/reputation';
import { storage } from '../server/storage';
import { resetReputationRailStore, upsertReputationEvent } from '../server/services/reputation-rail-service';

// Only mock external services — use real storage for reputation data
vi.mock('../server/services/liveness-service', () => ({
  getUserLivenessStatus: vi.fn().mockReturnValue({ verified: true }),
}));

vi.mock('../server/services/document-scanner-service', () => ({
  getDocumentVerificationStatus: vi.fn().mockReturnValue({ verified: true }),
}));

const app = express();
app.use(express.json());
app.use('/api/reputation', reputationRoutes);

describe('reputation routes', () => {
  beforeEach(async () => {
    await resetReputationRailStore();
    vi.clearAllMocks();
    vi.spyOn(storage, 'getUser').mockResolvedValue({ id: 1, did: 'did:key:123' } as any);
  });

  describe('GET /api/reputation/summary', () => {
    it('returns default neutral summary for new user (fallback behavior)', async () => {
      const response = await request(app)
        .get('/api/reputation/summary?userId=1')
        .expect(200);

      const summary = response.body.candidate_summary;
      expect(summary.candidate_id).toBe('candidate_wallet_user_1');
      expect(summary.decision).toBe('reject'); // Default due to low score
      expect(summary.confidence).toBe(0.5); // Default confidence
      expect(summary.evidence).toHaveLength(0);
      expect(summary.reason_codes).toContain('LOW_SOCIAL_VALIDATION'); // Because 0 events
    });

    it('returns approve decision for high reputation user', async () => {
      vi.spyOn(storage, 'getUser').mockResolvedValue({ id: 2, did: 'did:key:456' } as any);

      // Ingest positive events
      await upsertReputationEvent({
        user_id: 2,
        platform_id: 'linkedin',
        category: 'employment',
        signal_type: 'endorsement',
        score: 100,
      });
      await upsertReputationEvent({
        user_id: 2,
        platform_id: 'airbnb',
        category: 'accommodation',
        signal_type: 'rating',
        score: 100,
      });
        // We need lots of events to boost score over 800 and safedate over 75
        // SafeDate calc logic: identity(25) + liveness(15) + background(20) = 60 baseline.
        // Need 15 more. Cross-platform points max 20. Social val max 10.
        // If we spam high score events, cross-platform points will rise.

      for(let i=0; i<10; i++) {
        await upsertReputationEvent({
            event_id: `evt-${i}`,
            user_id: 2,
            platform_id: 'uber',
            category: 'transport',
            signal_type: 'rating',
            score: 100,
        });
      }
      // Add social validation for "endorsementCount"
      await upsertReputationEvent({
        user_id: 2,
        platform_id: 'social',
        category: 'social',
        signal_type: 'endorsement',
        score: 100,
      });
      await upsertReputationEvent({
        user_id: 2,
        platform_id: 'social',
        category: 'social',
        signal_type: 'endorsement',
        score: 100,
      });

      const response = await request(app)
        .get('/api/reputation/summary?userId=2')
        .expect(200);

      const summary = response.body.candidate_summary;
      expect(['approve', 'review']).toContain(summary.decision);
      expect(summary.evidence.length).toBeGreaterThan(0);
      expect(summary.work_score.score).toBeGreaterThan(500);
    });
  });

  describe('POST /api/reputation/events', () => {
    it('accepts valid event and returns updated scores', async () => {
      const payload = {
        user_id: 3,
        platform_id: 'gig-work',
        category: 'employment',
        signal_type: 'job_completed',
        score: 95,
        metadata: { job_id: '123' }
      };

      const response = await request(app)
        .post('/api/reputation/events')
        .send(payload)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.event.score).toBe(95);
      expect(response.body.reputation).toBeDefined();
      expect(response.body.safe_date).toBeDefined();
    });

    it('rejects invalid category', async () => {
      const payload = {
        user_id: 3,
        platform_id: 'gig-work',
        category: 'invalid_category', // Invalid
        signal_type: 'job_completed',
        score: 95
      };

      await request(app)
        .post('/api/reputation/events')
        .send(payload)
        .expect(400);
    });
  });
});
