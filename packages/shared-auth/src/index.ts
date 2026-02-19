/**
 * @credverse/shared-auth
 * Shared authentication utilities for CredVerse applications
 */

// Types
export type {
    AuthUser,
    TokenPayload,
    TokenPair,
    VerifyTokenResult,
    AuthConfig
} from './types';

// Password utilities
export {
    hashPassword,
    comparePassword,
    validatePasswordStrength,
    type PasswordValidationResult
} from './password';

// JWT utilities
export {
    initAuth,
    generateAccessToken,
    generateRefreshToken,
    generateTokenPair,
    verifyAccessToken,
    verifyRefreshToken,
    verifyToken,
    invalidateAccessToken,
    invalidateRefreshToken,
    refreshAccessToken,
    getAuthConfig,
} from './jwt';

// Express middleware
export {
    authMiddleware,
    optionalAuthMiddleware,
    requireRole,
    checkRateLimit,
} from './middleware';

// Security middleware
export {
    setupSecurity,
    apiRateLimiter,
    authRateLimiter,
    sanitizeInput,
    deepSanitize,
    sanitizationMiddleware,
    suspiciousRequestDetector,
} from './security';

// Idempotency middleware
export {
    idempotencyMiddleware,
} from './idempotency';

// Signed webhook helpers
export {
    signWebhook,
    verifyWebhookSignature,
    type SignedWebhookPayload,
} from './webhooks';

// Shared contracts
export type {
    CredentialFormat,
    CredentialRecordContract,
    VerificationResultContract,
    TrustScoreSnapshotContract,
    ConsentGrantContract,
    ReputationCategoryContract,
    ReputationEventContract,
    ReputationCategoryBreakdownContract,
    ReputationScoreContract,
    SafeDateScoreContract,
    ReputationProfileContract,
    PlatformAuthorityContract,
    ProofFormatContract,
    ProofPurposeContract,
    ProofGenerationRequestContract,
    ProofGenerationResultContract,
    ProofVerificationRequestContract,
    ProofVerificationResultContract,
    RevocationWitnessContract,
} from './contracts';

// Reputation contracts (WorkScore/SafeDate)
export {
    REASON_CODE_VALUES,
    toSafeDateBadgeLevel,
} from './reputation-contracts';
export type {
    KnownReasonCode,
    ReasonCode,
    VerificationDecision,
    WorkScoreBreakdown,
    VerificationEvidence,
    CandidateVerificationSummary,
    SafeDateBadge,
} from './reputation-contracts';

// Recruiter evaluation contracts (WorkScore/SafeDate)
export {
    WORKSCORE_WEIGHTS,
    WORKSCORE_REASON_CODES,
    SAFEDATE_WEIGHTS,
    SAFEDATE_REASON_CODES,
} from './recruiter-evaluation-contracts';
export type {
    WorkScoreComponent,
    WorkScoreReasonCode,
    WorkScoreDecision,
    WorkScoreInput,
    WorkScoreBreakdownMap,
    WorkScoreEvidence,
    WorkScoreEvaluationRequestContract,
    WorkScoreEvaluationContract,
    SafeDateFactor,
    SafeDateReasonCode,
    SafeDateDecision,
    SafeDateInput,
    SafeDateBreakdownMap,
    SafeDateEvidence,
    SafeDateEvaluationRequestContract,
    SafeDateEvaluationContract,
} from './recruiter-evaluation-contracts';

// Blockchain network/runtime helpers
export type {
    SupportedChainNetwork,
    ChainRuntimeConfig,
} from './blockchain-network';
export {
    resolveChainNetwork,
    getChainRuntimeConfig,
    resolveChainRpcUrl,
    getChainWritePolicy,
} from './blockchain-network';

// PostgreSQL-backed state persistence helper
export {
    PostgresStateStore,
} from './postgres-state-store';

// Audit chain helpers
export type {
    AuditEventRecord,
} from './audit-chain';
export {
    appendAuditEvent,
    computeAuditEventHash,
    verifyAuditChain,
} from './audit-chain';
