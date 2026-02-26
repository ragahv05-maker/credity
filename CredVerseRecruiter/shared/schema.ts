import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const verifications = pgTable("verifications", {
  id: varchar("id").primaryKey(),
  credentialType: text("credential_type").notNull(),
  issuer: text("issuer").notNull(),
  subject: text("subject").notNull(),
  status: text("status").notNull(),
  riskScore: integer("risk_score").notNull(),
  fraudScore: integer("fraud_score").notNull(),
  recommendation: text("recommendation").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  verifiedBy: text("verified_by").notNull(),
});

export const workScoreEvaluations = pgTable("work_score_evaluations", {
  id: varchar("id").primaryKey(),
  candidateHash: text("candidate_hash"),
  contextHash: text("context_hash"),
  score: integer("score").notNull(),
  breakdown: jsonb("breakdown").notNull().$type<Record<string, number>>(),
  decision: text("decision").notNull(),
  reasonCodes: jsonb("reason_codes").notNull().$type<string[]>(),
  evidence: jsonb("evidence").notNull().$type<{
    summary: string;
    anchors_checked: string[];
    docs_checked: string[];
  }>(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Verification = typeof verifications.$inferSelect;
export type WorkScoreEvaluation = typeof workScoreEvaluations.$inferSelect;
