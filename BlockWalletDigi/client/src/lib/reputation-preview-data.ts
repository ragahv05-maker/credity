import {
  toSafeDateBadgeLevel,
  type CandidateVerificationSummary,
  type SafeDateBadge,
} from "@/types/reputation-contracts";

export interface ReputationPreviewPayload {
  candidate: CandidateVerificationSummary;
  safeDate: SafeDateBadge;
}

interface SafeDateApiResponse {
  success: boolean;
  safe_date: {
    user_id: number;
    score: number;
    computed_at: string;
    reason_codes: string[];
    breakdown: SafeDateBadge["breakdown"];
  };
}

interface CandidateSummaryApiResponse {
  success: boolean;
  candidate_summary: CandidateVerificationSummary;
}

export const mockCandidateSummary: CandidateVerificationSummary = {
  candidate_id: "candidate_wallet_user_1",
  decision: "review",
  confidence: 0.88,
  risk_score: 0.24,
  reason_codes: ["WORK_HISTORY_VERIFIED", "MANUAL_REVIEW_REQUIRED"],
  work_score: {
    score: 812,
    max_score: 1000,
    computed_at: new Date().toISOString(),
    breakdown: [
      {
        category: "employment",
        weight: 0.4,
        score: 900,
        weighted_score: 360,
        event_count: 12,
      },
      {
        category: "identity",
        weight: 0.2,
        score: 850,
        weighted_score: 170,
        event_count: 5,
      },
      {
        category: "skill",
        weight: 0.25,
        score: 760,
        weighted_score: 190,
        event_count: 9,
      },
      {
        category: "finance",
        weight: 0.15,
        score: 610,
        weighted_score: 92,
        event_count: 4,
      },
    ],
  },
  evidence: [
    {
      id: "ev_01",
      type: "credential",
      issuer: "CredVerseIssuer",
      verified_at: new Date().toISOString(),
      metadata: { vc_format: "vc+jwt" },
    },
    {
      id: "ev_02",
      type: "reputation_event",
      uri: "credverse://events/ev_02",
      verified_at: new Date().toISOString(),
    },
  ],
};

export const mockSafeDate: SafeDateBadge = {
  user_id: 1,
  score: 78,
  badge_level: toSafeDateBadgeLevel(78),
  computed_at: new Date().toISOString(),
  reason_codes: ["SAFE_DATE_HIGH_TRUST"],
  breakdown: {
    identity_verified_points: 18,
    liveness_points: 15,
    background_clean_points: 14,
    cross_platform_reputation_points: 12,
    social_validation_points: 9,
    harassment_free_points: 10,
  },
};

export const mockReputationPreviewPayload: ReputationPreviewPayload = {
  candidate: mockCandidateSummary,
  safeDate: mockSafeDate,
};

async function fetchJson<T>(url: string, fetchImpl: typeof fetch): Promise<T> {
  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }
  return (await response.json()) as T;
}

export async function loadReputationPreviewData(
  userId: number,
  fetchImpl: typeof fetch = fetch,
): Promise<ReputationPreviewPayload> {
  const [summaryResponse, safeDateResponse] = await Promise.all([
    fetchJson<CandidateSummaryApiResponse>(
      `/api/reputation/summary?userId=${userId}`,
      fetchImpl,
    ),
    fetchJson<SafeDateApiResponse>(
      `/api/reputation/safedate?userId=${userId}`,
      fetchImpl,
    ),
  ]);

  if (!summaryResponse.success || !safeDateResponse.success) {
    throw new Error("Live reputation API returned unsuccessful status");
  }

  const candidate = summaryResponse.candidate_summary;

  const safeDate: SafeDateBadge = {
    ...safeDateResponse.safe_date,
    badge_level: toSafeDateBadgeLevel(safeDateResponse.safe_date.score),
  };

  return { candidate, safeDate };
}

export async function getReputationPreviewData(options: {
  liveModeEnabled: boolean;
  userId?: number;
  fetchImpl?: typeof fetch;
}): Promise<{
  payload: ReputationPreviewPayload;
  source: "mock" | "live";
  error?: string;
}> {
  const { liveModeEnabled, userId = 1, fetchImpl = fetch } = options;

  if (!liveModeEnabled) {
    return { payload: mockReputationPreviewPayload, source: "mock" };
  }

  try {
    const payload = await loadReputationPreviewData(userId, fetchImpl);
    return { payload, source: "live" };
  } catch (error: any) {
    return {
      payload: mockReputationPreviewPayload,
      source: "mock",
      error: error?.message || "Failed to load live reputation preview",
    };
  }
}
