import { pgTable, text, serial, integer, boolean, timestamp, jsonb, uuid, decimal, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  did: text("did"),
  name: text("name"),
  email: text("email"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  phoneNumber: text("phone_number"),
  phoneVerified: boolean("phone_verified").default(false),
  emailVerified: boolean("email_verified").default(false),
});

export const credentials = pgTable("credentials", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // Foreign key to users
  type: jsonb("type").notNull(), // Array of types, e.g., ["VerifiableCredential", "UniversityDegree"]
  issuer: text("issuer").notNull(),
  issuanceDate: timestamp("issuance_date").notNull(),
  data: jsonb("data").notNull(), // The credential subject data
  jwt: text("jwt"), // The raw VC-JWT
  isArchived: boolean("is_archived").default(false),
});

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(), // "receive", "share", "connect"
  description: text("description").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const otpCodes = pgTable("otp_codes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  identifier: text("identifier").notNull(), // email or phone number
  code: text("code").notNull(), // bcrypt-hashed 6-digit code
  purpose: varchar("purpose", { length: 30 }).notNull(), // email_verify | phone_verify | password_reset
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const deviceFingerprints = pgTable("device_fingerprints", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  fingerprint: text("fingerprint").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
  lastSeenAt: timestamp("last_seen_at").defaultNow(),
});

// Claims table - PRD v3.1 Feature 2
export const claims = pgTable("claims", {
  id: serial("id").primaryKey(),
  claimantUserId: integer("claimant_user_id").notNull(),
  platformId: varchar("platform_id", { length: 255 }),
  claimType: varchar("claim_type", { length: 50 }), // insurance_auto, refund_request, age_verification
  claimAmount: decimal("claim_amount", { precision: 12, scale: 2 }),
  description: text("description"),
  timeline: jsonb("timeline"), // Array of {event, time, location}
  evidenceIds: jsonb("evidence_ids"), // Array of evidence IDs
  identityScore: integer("identity_score"),
  integrityScore: integer("integrity_score"),
  authenticityScore: integer("authenticity_score"),
  trustScore: integer("trust_score"),
  recommendation: varchar("recommendation", { length: 20 }), // approve, review, investigate, reject
  redFlags: jsonb("red_flags"),
  aiAnalysis: jsonb("ai_analysis"),
  processingTimeMs: integer("processing_time_ms"),
  createdAt: timestamp("created_at").defaultNow(),
  processedAt: timestamp("processed_at"),
});

// Evidence table - PRD v3.1 Layer 3
export const evidence = pgTable("evidence", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  claimId: integer("claim_id"),
  mediaType: varchar("media_type", { length: 20 }), // image, video, document
  storageUrl: text("storage_url"),
  authenticityScore: integer("authenticity_score"),
  isAiGenerated: boolean("is_ai_generated"),
  manipulationDetected: boolean("manipulation_detected"),
  metadata: jsonb("metadata"), // EXIF data
  blockchainHash: varchar("blockchain_hash", { length: 66 }),
  analysisData: jsonb("analysis_data"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  analyzedAt: timestamp("analyzed_at"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  did: true,
  name: true,
  email: true,
  bio: true,
  avatarUrl: true,
  phoneNumber: true,
  phoneVerified: true,
  emailVerified: true,
});

export const insertCredentialSchema = createInsertSchema(credentials).pick({
  userId: true,
  type: true,
  issuer: true,
  issuanceDate: true,
  data: true,
  jwt: true,
  isArchived: true,
});

export const insertActivitySchema = createInsertSchema(activities).pick({
  userId: true,
  type: true,
  description: true,
});

export const insertClaimSchema = createInsertSchema(claims).pick({
  claimantUserId: true,
  platformId: true,
  claimType: true,
  claimAmount: true,
  description: true,
  timeline: true,
  evidenceIds: true,
});

export const insertEvidenceSchema = createInsertSchema(evidence).pick({
  userId: true,
  claimId: true,
  mediaType: true,
  storageUrl: true,
  metadata: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertCredential = z.infer<typeof insertCredentialSchema>;
export type Credential = typeof credentials.$inferSelect;

export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;

export type InsertClaim = z.infer<typeof insertClaimSchema>;
export type Claim = typeof claims.$inferSelect;

export type InsertEvidence = z.infer<typeof insertEvidenceSchema>;
export type Evidence = typeof evidence.$inferSelect;

export type OtpCode = typeof otpCodes.$inferSelect;
export type InsertOtpCode = typeof otpCodes.$inferInsert;

export type DeviceFingerprint = typeof deviceFingerprints.$inferSelect;
export type InsertDeviceFingerprint = typeof deviceFingerprints.$inferInsert;

// ── Billing tables (Agent 6 — PRD §16.3, §16.4, §22.x) ────────────────────────

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  plan: varchar("plan", { length: 50 }).notNull(),
  // "safedate_premium" | "workscore_pro" | "gig_pro" | "smb_employer" | "free"
  status: varchar("status", { length: 20 }).notNull().default("active"),
  // "active" | "cancelled" | "past_due" | "trialing"
  razorpaySubscriptionId: text("razorpay_subscription_id").unique(),
  razorpayCustomerId: text("razorpay_customer_id"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelledAt: timestamp("cancelled_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const apiUsage = pgTable("api_usage", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  platformApiKey: text("platform_api_key"),   // for platform (B2B) usage
  endpoint: text("endpoint").notNull(),
  month: varchar("month", { length: 7 }).notNull(), // "2026-02"
  count: integer("count").notNull().default(0),
  lastRecordedAt: timestamp("last_recorded_at").defaultNow(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).pick({
  userId: true,
  plan: true,
  status: true,
  razorpaySubscriptionId: true,
  razorpayCustomerId: true,
  currentPeriodStart: true,
  currentPeriodEnd: true,
});

export const insertApiUsageSchema = createInsertSchema(apiUsage).pick({
  userId: true,
  platformApiKey: true,
  endpoint: true,
  month: true,
  count: true,
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

export type ApiUsage = typeof apiUsage.$inferSelect;
export type InsertApiUsage = typeof apiUsage.$inferInsert;

// ── Platform OAuth connections (Agent 5 — PRD §5.7, §5.8) ─────────────────────

export const platformConnections = pgTable("platform_connections", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  platformId: varchar("platform_id", { length: 100 }).notNull(), // "uber" | "linkedin" | "swiggy"
  platformName: text("platform_name").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending|active|revoked
  oauthAccessToken: text("oauth_access_token"),   // encrypted
  oauthRefreshToken: text("oauth_refresh_token"), // encrypted
  scopes: text("scopes"),
  connectedAt: timestamp("connected_at"),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type PlatformConnection = typeof platformConnections.$inferSelect;
export type InsertPlatformConnection = typeof platformConnections.$inferInsert;

// ── Reputation tables (Agent 3 — PRD §3.3, §7.6, §17.3) ───────────────────────

export const reputationEvents = pgTable("reputation_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  eventId: text("event_id").notNull().unique(),     // SHA-256 hash (dedup key)
  platform: text("platform").notNull(),
  category: varchar("category", { length: 50 }).notNull(), // identity/collaboration/etc
  signalType: text("signal_type").notNull(),
  score: integer("score").notNull(),                // 0 to 100
  weight: integer("weight").notNull(),
  decayFactor: decimal("decay_factor", { precision: 5, scale: 4 }),
  metadata: jsonb("metadata"),
  eventDate: timestamp("event_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reputationScores = pgTable("reputation_scores", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),    // one row per user
  rawScore: integer("raw_score").notNull().default(500),
  normalizedScore: integer("normalized_score").notNull().default(500),
  categoryBreakdown: jsonb("category_breakdown"),  // { identity: 120, collaboration: 80, ... }
  eventCount: integer("event_count").notNull().default(0),
  lastCalculatedAt: timestamp("last_calculated_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const safeDateScores = pgTable("safedate_scores", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),   // one row per user
  score: integer("score").notNull().default(50),   // 0-100
  trustLevel: varchar("trust_level", { length: 20 }),
  inputs: jsonb("inputs"),                          // raw SafeDate factor inputs
  calculatedAt: timestamp("calculated_at").defaultNow(),
});

export type ReputationEvent = typeof reputationEvents.$inferSelect;
export type NewReputationEvent = typeof reputationEvents.$inferInsert;

export type ReputationScore = typeof reputationScores.$inferSelect;
export type NewReputationScore = typeof reputationScores.$inferInsert;

export type SafeDateScore = typeof safeDateScores.$inferSelect;
export type NewSafeDateScore = typeof safeDateScores.$inferInsert;
