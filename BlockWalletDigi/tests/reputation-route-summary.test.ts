import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const trustGetReputationScore = vi.fn();
const trustGetSafeDateScore = vi.fn();
const trustClientCtor = vi.fn(
  class TrustClientMock {
    constructor(_options: unknown) {}

    getReputationScore = trustGetReputationScore;
    getSafeDateScore = trustGetSafeDateScore;
  },
);

const calculateReputationScore = vi.fn();
const calculateSafeDateScore = vi.fn();
const deriveSafeDateInputs = vi.fn();
const listReputationEvents = vi.fn();
const upsertReputationEvent = vi.fn();

const getUser = vi.fn();
const getUserLivenessStatus = vi.fn();
const getDocumentVerificationStatus = vi.fn();

vi.mock('@credverse/trust', () => ({
  CredVerse: trustClientCtor,
}));

vi.mock('../server/services/reputation-rail-service', () => ({
  calculateReputationScore,
  calculateSafeDateScore,
  deriveSafeDateInputs,
  listReputationEvents,
  upsertReputationEvent,
}));

vi.mock('../server/storage', () => ({
  storage: {
    getUser,
  },
}));

vi.mock('../server/services/liveness-service', () => ({
  getUserLivenessStatus,
}));

vi.mock('../server/services/document-scanner-service', () => ({
  getDocumentVerificationStatus,
}));

async function createApp() {
  const app = express();
  app.use(express.json());
  const { default: reputationRoutes } = await import('../server/routes/reputation');
  app.use('/api/v1/reputation', reputationRoutes);
  return app;
}

describe('wallet reputation summary route trust-sdk integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    trustGetReputationScore.mockReset();
    trustGetSafeDateScore.mockReset();

    calculateReputationScore.mockResolvedValue({
      user_id: 7,
      score: 640,
      event_count: 2,
      category_breakdown: [
        { category: 'employment', weight: 20, score: 70, weighted_score: 14, event_count: 1 },
      ],
      computed_at: '2026-02-17T11:00:00.000Z',
    });

    calculateSafeDateScore.mockReturnValue({
      user_id: 7,
      score: 58,
      computed_at: '2026-02-17T11:00:00.000Z',
      reason_codes: ['low_social_validation'],
      breakdown: {
        identity_verified_points: 10,
        liveness_points: 15,
        background_clean_points: 20,
        cross_platform_reputation_points: 13,
        social_validation_points: 0,
        harassment_free_points: 10,
      },
    });

    deriveSafeDateInputs.mockResolvedValue({
      backgroundFlags: 0,
      endorsementCount: 0,
      harassmentReports: 0,
    });

    listReputationEvents.mockResolvedValue([
      {
        id: 'event-1',
        event_id: 'event-1',
        user_id: 7,
        platform_id: 'demo-platform',
        category: 'employment',
        signal_type: 'verified_reference',
        score: 80,
        occurred_at: '2026-02-17T10:30:00.000Z',
        created_at: '2026-02-17T10:30:00.000Z',
      },
    ]);

    upsertReputationEvent.mockResolvedValue({
      accepted: true,
      duplicate: false,
      event: {
        id: 'event-1',
        event_id: 'event-1',
        user_id: 7,
        platform_id: 'demo-platform',
        category: 'employment',
        signal_type: 'verified_reference',
        score: 80,
        occurred_at: '2026-02-17T10:30:00.000Z',
        created_at: '2026-02-17T10:30:00.000Z',
      },
    });

    getUser.mockResolvedValue({ id: 7, did: 'did:credverse:user:7' });
    getUserLivenessStatus.mockReturnValue({ verified: true });
    getDocumentVerificationStatus.mockReturnValue({ verified: true });

    delete process.env.REPUTATION_TRUST_SDK_ENABLED;
    delete process.env.TRUST_SDK_BASE_URL;
    delete process.env.TRUST_SDK_API_KEY;
    delete process.env.TRUST_SDK_TIMEOUT_MS;
  });

  it('uses trust-sdk path for summary/score when enabled and keeps weight normalization stable', async () => {
    process.env.REPUTATION_TRUST_SDK_ENABLED = 'true';
    process.env.TRUST_SDK_BASE_URL = 'https://issuer.internal';
    process.env.TRUST_SDK_API_KEY = 'issuer-key';
    process.env.TRUST_SDK_TIMEOUT_MS = '8000';

    trustGetReputationScore.mockResolvedValue({
      user_id: 42,
      score: 910,
      event_count: 3,
      category_breakdown: [
        { category: 'employment', weight: 0.2, score: 90, weighted_score: 18, event_count: 2 },
      ],
      computed_at: '2026-02-17T12:00:00.000Z',
    });

    trustGetSafeDateScore.mockResolvedValue({
      user_id: 42,
      score: 81,
      computed_at: '2026-02-17T12:00:00.000Z',
      reason_codes: ['safe_date_high_trust'],
      breakdown: {
        identity_verified_points: 25,
        liveness_points: 15,
        background_clean_points: 20,
        cross_platform_reputation_points: 18,
        social_validation_points: 3,
        harassment_free_points: 0,
      },
    });

    const app = await createApp();

    const scoreRes = await request(app).get('/api/v1/reputation/score').query({ userId: 42 });
    expect(scoreRes.status).toBe(200);
    expect(scoreRes.body.reputation.score).toBe(910);

    const summaryRes = await request(app).get('/api/v1/reputation/summary').query({ userId: 42 });
    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.candidate_summary.work_score.score).toBe(910);
    expect(summaryRes.body.candidate_summary.work_score.breakdown[0].weight).toBe(0.2);
    expect(summaryRes.body.candidate_summary.decision).toBe('approve');

    expect(trustClientCtor).toHaveBeenCalledWith({
      baseUrl: 'https://issuer.internal',
      apiKey: 'issuer-key',
      timeoutMs: 8000,
    });
    expect(calculateReputationScore).not.toHaveBeenCalled();
  });

  it('falls back to local reputation computation when trust-sdk request fails', async () => {
    process.env.REPUTATION_TRUST_SDK_ENABLED = 'true';
    process.env.TRUST_SDK_BASE_URL = 'https://issuer.internal';

    trustGetReputationScore.mockRejectedValue(new Error('issuer unavailable'));
    trustGetSafeDateScore.mockResolvedValue({
      user_id: 7,
      score: 60,
      computed_at: '2026-02-17T12:00:00.000Z',
      reason_codes: [],
      breakdown: {
        identity_verified_points: 20,
        liveness_points: 15,
        background_clean_points: 15,
        cross_platform_reputation_points: 10,
        social_validation_points: 0,
        harassment_free_points: 0,
      },
    });

    const app = await createApp();

    const scoreRes = await request(app).get('/api/v1/reputation/score').query({ userId: 7 });
    expect(scoreRes.status).toBe(200);
    expect(scoreRes.body.reputation.score).toBe(640);

    const summaryRes = await request(app).get('/api/v1/reputation/summary').query({ userId: 7 });
    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.candidate_summary.work_score.score).toBe(640);
    expect(summaryRes.body.candidate_summary.decision).toBe('review');
    expect(summaryRes.body.candidate_summary.reason_codes).toContain('LOW_SOCIAL_VALIDATION');

    expect(calculateReputationScore).toHaveBeenCalled();
    expect(calculateSafeDateScore).toHaveBeenCalled();
  });
});
