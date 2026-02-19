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
} from './types.js';

// Password utilities
export {
    hashPassword,
    comparePassword,
    validatePasswordStrength,
    type PasswordValidationResult
} from './password.js';

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
} from './jwt.js';

// Express middleware
export {
    authMiddleware,
    optionalAuthMiddleware,
    requireRole,
    checkRateLimit,
} from './middleware.js';

// Security middleware
export {
    setupSecurity,
    apiRateLimiter,
    authRateLimiter,
    sanitizeInput,
    deepSanitize,
    sanitizationMiddleware,
    suspiciousRequestDetector,
} from './security.js';

// Idempotency middleware
export {
    idempotencyMiddleware,
} from './idempotency.js';

// Signed webhook helpers
export {
    signWebhook,
    verifyWebhookSignature,
    type SignedWebhookPayload,
} from './webhooks.js';

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
} from './contracts.js';

// Reputation contracts (WorkScore/SafeDate)
export {
    REASON_CODE_VALUES,
    toSafeDateBadgeLevel,
} from './reputation-contracts.js';
export type {
    KnownReasonCode,
    ReasonCode,
    VerificationDecision,
    WorkScoreBreakdown,
    VerificationEvidence,
    CandidateVerificationSummary,
    SafeDateBadge,
} from './reputation-contracts.js';

// Recruiter evaluation contracts (WorkScore/SafeDate)
export {
    WORKSCORE_WEIGHTS,
    WORKSCORE_REASON_CODES,
    SAFEDATE_WEIGHTS,
    SAFEDATE_REASON_CODES,
} from './recruiter-evaluation-contracts.js';
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
} from './recruiter-evaluation-contracts.js';

// Blockchain network/runtime helpers
export type {
    SupportedChainNetwork,
    ChainRuntimeConfig,
} from './blockchain-network.js';
export {
    resolveChainNetwork,
    getChainRuntimeConfig,
    resolveChainRpcUrl,
    getChainWritePolicy,
} from './blockchain-network.js';

// PostgreSQL-backed state persistence helper
export {
    PostgresStateStore,
} from './postgres-state-store.js';

// Audit chain helpers
export type {
    AuditEventRecord,
} from './audit-chain.js';
export {
    appendAuditEvent,
    computeAuditEventHash,
    verifyAuditChain,
} from './audit-chain.js';
