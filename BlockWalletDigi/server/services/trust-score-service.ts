/**
 * Trust Score Service
 * Calculates user trust scores based on identity verification, activity, and reputation
 */

// ==================== TYPES ====================

export interface UserTrustData {
  userId: number;
  // Identity
  livenessVerified: boolean;
  documentVerified: boolean;
  biometricsSetup: boolean;
  digilockerConnected: boolean;
  // Activity
  totalCredentials: number;
  totalVerifications: number;
  platformConnectionCount: number;
  lastActivityDate: Date;
  // Reputation
  suspiciousActivityFlags: number;
  endorsementCount: number;
  positiveFeedbackCount: number;
  negativeFeedbackCount: number;
}

export interface TrustScoreBreakdown {
  totalScore: number;
  level: number;
  levelLabel: string;
  identity: {
    score: number;
    maxScore: number;
    livenessPoints: number;
    documentPoints: number;
    biometricPoints: number;
    digilockerPoints: number;
  };
  activity: {
    score: number;
    maxScore: number;
    credentialPoints: number;
    verificationPoints: number;
    connectionPoints: number;
  };
  reputation: {
    score: number;
    maxScore: number;
    flagPenalty: number;
    endorsementPoints: number;
    feedbackPoints: number;
  };
}

export interface ImprovementSuggestion {
  id: string;
  title: string;
  description: string;
  points: number;
  category: "quick_win" | "long_term";
  action: string;
  priority: number;
}

// ==================== SCORE CALCULATION ====================

/**
 * Calculate trust score from user data
 * Score is 0-100 broken into: Identity (40%), Activity (30%), Reputation (30%)
 */
export function calculateTrustScore(
  userData: UserTrustData,
): TrustScoreBreakdown {
  // Identity Score (max 40 points)
  const livenessPoints = userData.livenessVerified ? 15 : 0;
  const documentPoints = userData.documentVerified ? 10 : 0;
  const biometricPoints = userData.biometricsSetup ? 10 : 0;
  const digilockerPoints = userData.digilockerConnected ? 5 : 0;
  const identityScore =
    livenessPoints + documentPoints + biometricPoints + digilockerPoints;

  // Activity Score (max 30 points)
  const credentialPoints = Math.min(userData.totalCredentials * 2, 10);
  const verificationPoints = Math.min(userData.totalVerifications * 2, 10);
  const connectionPoints = Math.min(userData.platformConnectionCount * 2, 10);
  const activityScore =
    credentialPoints + verificationPoints + connectionPoints;

  // Reputation Score (max 30 points)
  const flagPenalty = userData.suspiciousActivityFlags * 10;
  const endorsementPoints = Math.min(userData.endorsementCount * 3, 15);
  const positiveFeedback = Math.min(userData.positiveFeedbackCount * 2, 10);
  const negativeFeedback = userData.negativeFeedbackCount * 5;
  const feedbackPoints = Math.max(0, positiveFeedback - negativeFeedback);
  const baseReputation = 30 - flagPenalty;
  const reputationScore = Math.max(
    0,
    Math.min(30, baseReputation + endorsementPoints + feedbackPoints - 15),
  );

  // Total Score
  const totalScore = identityScore + activityScore + reputationScore;

  // Determine Level
  const { level, levelLabel } = getLevel(totalScore);

  return {
    totalScore,
    level,
    levelLabel,
    identity: {
      score: identityScore,
      maxScore: 40,
      livenessPoints,
      documentPoints,
      biometricPoints,
      digilockerPoints,
    },
    activity: {
      score: activityScore,
      maxScore: 30,
      credentialPoints,
      verificationPoints,
      connectionPoints,
    },
    reputation: {
      score: reputationScore,
      maxScore: 30,
      flagPenalty,
      endorsementPoints,
      feedbackPoints,
    },
  };
}

/**
 * Get trust level from score
 */
function getLevel(score: number): { level: number; levelLabel: string } {
  if (score >= 90) return { level: 5, levelLabel: "Diamond" };
  if (score >= 75) return { level: 4, levelLabel: "Platinum" };
  if (score >= 60) return { level: 3, levelLabel: "Gold" };
  if (score >= 40) return { level: 2, levelLabel: "Silver" };
  if (score >= 20) return { level: 1, levelLabel: "Bronze" };
  return { level: 0, levelLabel: "Unverified" };
}

// ==================== IMPROVEMENT SUGGESTIONS ====================

/**
 * Generate improvement suggestions based on current state
 */
export function generateImprovementSuggestions(
  userData: UserTrustData,
  breakdown: TrustScoreBreakdown,
): ImprovementSuggestion[] {
  const suggestions: ImprovementSuggestion[] = [];

  // Identity suggestions
  if (!userData.livenessVerified) {
    suggestions.push({
      id: "liveness",
      title: "Complete Liveness Check",
      description: "Verify you're a real person with a quick face scan",
      points: 15,
      category: "quick_win",
      action: "/liveness",
      priority: 1,
    });
  }

  if (!userData.documentVerified) {
    suggestions.push({
      id: "document",
      title: "Verify a Document",
      description: "Upload and verify a government ID",
      points: 10,
      category: "quick_win",
      action: "/verify-document",
      priority: 2,
    });
  }

  if (!userData.biometricsSetup) {
    suggestions.push({
      id: "biometrics",
      title: "Enable Biometrics",
      description: "Secure your wallet with Face ID or fingerprint",
      points: 10,
      category: "quick_win",
      action: "/settings/biometrics",
      priority: 3,
    });
  }

  if (!userData.digilockerConnected) {
    suggestions.push({
      id: "digilocker",
      title: "Connect DigiLocker",
      description: "Import your government documents instantly",
      points: 5,
      category: "quick_win",
      action: "/connect/digilocker",
      priority: 4,
    });
  }

  // Activity suggestions
  if (userData.totalCredentials < 5) {
    suggestions.push({
      id: "credentials",
      title: "Add More Credentials",
      description: "Import certificates, degrees, or work experience",
      points: Math.min((5 - userData.totalCredentials) * 2, 10),
      category: "long_term",
      action: "/add-credential",
      priority: 5,
    });
  }

  if (userData.platformConnectionCount < 3) {
    suggestions.push({
      id: "connections",
      title: "Connect Platforms",
      description: "Link LinkedIn, GitHub, or other professional profiles",
      points: Math.min((3 - userData.platformConnectionCount) * 2, 6),
      category: "long_term",
      action: "/connect",
      priority: 6,
    });
  }

  // Reputation suggestions
  if (userData.endorsementCount < 3) {
    suggestions.push({
      id: "endorsements",
      title: "Get Endorsements",
      description: "Ask colleagues or institutions to endorse your credentials",
      points: Math.min((3 - userData.endorsementCount) * 3, 9),
      category: "long_term",
      action: "/request-endorsement",
      priority: 7,
    });
  }

  // Sort by priority
  return suggestions.sort((a, b) => a.priority - b.priority);
}

// ==================== HISTORY ====================

// In-memory score history (would be database in production)
const scoreHistory = new Map<number, { date: string; score: number }[]>();

/**
 * Get score history for a user
 */
export function getScoreHistory(
  userId: number,
): { date: string; score: number }[] {
  // Return stored history or generate mock data
  if (scoreHistory.has(userId)) {
    return scoreHistory.get(userId)!;
  }

  // Generate mock history for demo
  const history: { date: string; score: number }[] = [];
  const today = new Date();
  let baseScore = 30;

  for (let i = 30; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // Simulate gradual score increase
    baseScore = Math.min(100, baseScore + Math.floor(Math.random() * 5));

    history.push({
      date: date.toISOString().split("T")[0],
      score: baseScore,
    });
  }

  scoreHistory.set(userId, history);
  return history;
}

/**
 * Add a score entry to history
 */
export function addScoreToHistory(userId: number, score: number): void {
  const today = new Date().toISOString().split("T")[0];

  if (!scoreHistory.has(userId)) {
    scoreHistory.set(userId, []);
  }

  const history = scoreHistory.get(userId)!;

  // Update today's entry or add new one
  const todayIndex = history.findIndex((h) => h.date === today);
  if (todayIndex >= 0) {
    history[todayIndex].score = score;
  } else {
    history.push({ date: today, score });
  }

  // Keep only last 90 days
  while (history.length > 90) {
    history.shift();
  }
}
