import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  jsonb,
  uuid,
  pgEnum,
  real,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const trustStatusEnum = pgEnum("trust_status", [
  "pending",
  "trusted",
  "revoked",
]);
export const studentStatusEnum = pgEnum("student_status", [
  "Active",
  "Alumni",
  "Suspended",
]);
export const teamRoleEnum = pgEnum("team_role", ["Admin", "Issuer", "Viewer"]);
export const teamStatusEnum = pgEnum("team_status", [
  "Active",
  "Pending",
  "Inactive",
]);
export const verificationStatusEnum = pgEnum("verification_status", [
  "success",
  "failed",
  "suspicious",
]);
export const reputationCategoryEnum = pgEnum("reputation_category", [
  "transport",
  "accommodation",
  "delivery",
  "employment",
  "finance",
  "social",
  "identity",
]);
export const reputationVerticalEnum = pgEnum("reputation_vertical", [
  "overall",
  "work",
  "safe_date",
  "gig",
  "rental",
  "health",
  "education",
  "finance",
  "identity",
]);
export const platformAuthorityStatusEnum = pgEnum("platform_authority_status", [
  "pending",
  "active",
  "suspended",
]);

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  plan: text("plan").default("free"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id)
    .notNull(),
  keyHash: text("key_hash").notNull(),
  permissions: jsonb("permissions").default([]),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
});

export const issuers = pgTable("issuers", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id)
    .notNull(),
  name: text("name").notNull(),
  domain: text("domain").notNull(),
  did: text("did"),
  trustStatus: trustStatusEnum("trust_status").default("pending"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").default("user"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const templates = pgTable("templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id)
    .notNull(),
  name: text("name").notNull(),
  schema: jsonb("schema").notNull(),
  render: text("render").notNull(),
  version: text("version").default("1.0.0"),
  disclosure: jsonb("disclosure").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const credentials = pgTable("credentials", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id)
    .notNull(),
  templateId: uuid("template_id")
    .references(() => templates.id)
    .notNull(),
  issuerId: uuid("issuer_id")
    .references(() => issuers.id)
    .notNull(),
  format: text("format").default("vc+jwt"),
  issuerDid: text("issuer_did"),
  subjectDid: text("subject_did"),
  statusListId: text("status_list_id"),
  statusListIndex: integer("status_list_index"),
  anchorBatchId: text("anchor_batch_id"),
  anchorProof: jsonb("anchor_proof"),
  holderBinding: jsonb("holder_binding"),
  issuanceFlow: text("issuance_flow").default("legacy"),
  recipient: jsonb("recipient").notNull(),
  credentialData: jsonb("credential_data").notNull(),
  vcJwt: text("vc_jwt"),
  ipfsHash: text("ipfs_hash"),
  anchorId: text("anchor_id"),
  txHash: text("tx_hash"),
  blockNumber: integer("block_number"),
  credentialHash: text("credential_hash"),
  revoked: boolean("revoked").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const trustScoreSnapshots = pgTable("trust_score_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  score: integer("score").notNull(),
  signalsVersion: text("signals_version").notNull(),
  featuresHash: text("features_hash").notNull(),
  modelVersion: text("model_version").notNull(),
  explanationJson: jsonb("explanation_json").notNull(),
  decayAppliedAt: timestamp("decay_applied_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const platformAuthorities = pgTable("platform_authorities", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  platformId: text("platform_id").notNull().unique(),
  name: text("name").notNull(),
  domain: text("domain"),
  status: platformAuthorityStatusEnum("status").default("pending"),
  allowedVerticals: jsonb("allowed_verticals").default([]),
  allowedCategories: jsonb("allowed_categories").default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reputationEvents = pgTable("reputation_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: text("event_id").unique(),
  subjectDid: text("subject_did").notNull(),
  platformId: text("platform_id").notNull(),
  category: reputationCategoryEnum("category").notNull(),
  signalType: text("signal_type").notNull(),
  score: integer("score").notNull(),
  occurredAt: timestamp("occurred_at").notNull(),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reputationSignalSnapshots = pgTable(
  "reputation_signal_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subjectDid: text("subject_did").notNull(),
    signals: jsonb("signals").notNull(),
    signalsVersion: text("signals_version").notNull(),
    computedAt: timestamp("computed_at").defaultNow(),
  },
);

export const reputationScores = pgTable("reputation_scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  subjectDid: text("subject_did").notNull(),
  vertical: reputationVerticalEnum("vertical").default("overall"),
  score: integer("score").notNull(),
  eventCount: integer("event_count").notNull(),
  breakdown: jsonb("breakdown").default([]),
  computedAt: timestamp("computed_at").defaultNow(),
});

export const reputationShareGrants = pgTable("reputation_share_grants", {
  id: uuid("id").primaryKey().defaultRandom(),
  subjectDid: text("subject_did").notNull(),
  granteeId: text("grantee_id").notNull(),
  purpose: text("purpose").notNull(),
  dataElements: jsonb("data_elements").default([]),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const consentGrants = pgTable("consent_grants", {
  id: uuid("id").primaryKey().defaultRandom(),
  subjectId: uuid("subject_id").notNull(),
  verifierId: text("verifier_id").notNull(),
  purpose: text("purpose").notNull(),
  dataElements: jsonb("data_elements").default([]),
  expiry: timestamp("expiry").notNull(),
  revocationTs: timestamp("revocation_ts"),
  consentProof: jsonb("consent_proof").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const students = pgTable("students", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id)
    .notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  studentId: text("student_id").notNull(),
  program: text("program").notNull(),
  enrollmentYear: text("enrollment_year").notNull(),
  status: studentStatusEnum("status").default("Active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const teamMembers = pgTable("team_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id)
    .notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: teamRoleEnum("role").default("Viewer"),
  status: teamStatusEnum("status").default("Pending"),
  invitedAt: timestamp("invited_at").defaultNow(),
  joinedAt: timestamp("joined_at"),
});

export const verificationLogs = pgTable("verification_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id)
    .notNull(),
  credentialId: uuid("credential_id").references(() => credentials.id),
  verifierName: text("verifier_name").notNull(),
  verifierLocation: text("verifier_location"),
  ipAddress: text("ip_address"),
  status: verificationStatusEnum("status").default("success"),
  reason: text("reason"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const activityLogs = pgTable("activity_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id)
    .notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  metadata: jsonb("metadata"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const templateDesigns = pgTable("template_designs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id)
    .notNull(),
  name: text("name").notNull(),
  category: text("category"),
  type: text("type"),
  status: text("status").default("Draft"),
  fields: jsonb("fields").default([]),
  backgroundColor: text("background_color").default("#ffffff"),
  width: integer("width").default(842),
  height: integer("height").default(595),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertTenantSchema = createInsertSchema(tenants);
export const insertApiKeySchema = createInsertSchema(apiKeys);
export const insertIssuerSchema = createInsertSchema(issuers);
export const insertUserSchema = createInsertSchema(users);
export const insertTemplateSchema = createInsertSchema(templates);
export const insertCredentialSchema = createInsertSchema(credentials);
export const insertStudentSchema = createInsertSchema(students);
export const insertTeamMemberSchema = createInsertSchema(teamMembers);
export const insertVerificationLogSchema = createInsertSchema(verificationLogs);
export const insertActivityLogSchema = createInsertSchema(activityLogs);
export const insertTemplateDesignSchema = createInsertSchema(templateDesigns);
export const insertTrustScoreSnapshotSchema =
  createInsertSchema(trustScoreSnapshots);
export const insertConsentGrantSchema = createInsertSchema(consentGrants);
export const insertPlatformAuthoritySchema =
  createInsertSchema(platformAuthorities);
export const insertReputationEventSchema = createInsertSchema(reputationEvents);
export const insertReputationSignalSnapshotSchema = createInsertSchema(
  reputationSignalSnapshots,
);
export const insertReputationScoreSchema = createInsertSchema(reputationScores);
export const insertReputationShareGrantSchema = createInsertSchema(
  reputationShareGrants,
);

// Types
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;

export type Issuer = typeof issuers.$inferSelect;
export type InsertIssuer = z.infer<typeof insertIssuerSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Template = typeof templates.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;

export type Credential = typeof credentials.$inferSelect;
export type InsertCredential = z.infer<typeof insertCredentialSchema>;

export type PlatformAuthority = typeof platformAuthorities.$inferSelect;
export type InsertPlatformAuthority = z.infer<
  typeof insertPlatformAuthoritySchema
>;

export type ReputationEvent = typeof reputationEvents.$inferSelect;
export type InsertReputationEvent = z.infer<typeof insertReputationEventSchema>;

export type ReputationSignalSnapshot =
  typeof reputationSignalSnapshots.$inferSelect;
export type InsertReputationSignalSnapshot = z.infer<
  typeof insertReputationSignalSnapshotSchema
>;

export type ReputationScore = typeof reputationScores.$inferSelect;
export type InsertReputationScore = z.infer<typeof insertReputationScoreSchema>;

export type ReputationShareGrant = typeof reputationShareGrants.$inferSelect;
export type InsertReputationShareGrant = z.infer<
  typeof insertReputationShareGrantSchema
>;

export type Student = typeof students.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;

export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;

export type VerificationLog = typeof verificationLogs.$inferSelect;
export type InsertVerificationLog = z.infer<typeof insertVerificationLogSchema>;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

export type TemplateDesign = typeof templateDesigns.$inferSelect;
export type InsertTemplateDesign = z.infer<typeof insertTemplateDesignSchema>;

export type TrustScoreSnapshot = typeof trustScoreSnapshots.$inferSelect;
export type InsertTrustScoreSnapshot = z.infer<
  typeof insertTrustScoreSnapshotSchema
>;

export type ConsentGrant = typeof consentGrants.$inferSelect;
export type InsertConsentGrant = z.infer<typeof insertConsentGrantSchema>;
