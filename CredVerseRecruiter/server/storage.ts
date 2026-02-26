import { type User, type InsertUser, users, verifications, workScoreEvaluations } from "@shared/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { db } from "./db";
import { randomUUID } from "crypto";

// modify the interface with any CRUD methods
// you might need

export interface VerificationRecord {
  id: string;
  credentialType: string;
  issuer: string;
  subject: string;
  status: string;
  riskScore: number;
  fraudScore: number;
  recommendation: string;
  timestamp: Date;
  verifiedBy: string;
}

export interface WorkScoreEvaluationSnapshot {
  id: string;
  candidate_hash?: string;
  context_hash?: string;
  score: number;
  breakdown: Record<string, number>;
  decision: string;
  reason_codes: string[];
  evidence: {
    summary: string;
    anchors_checked: string[];
    docs_checked: string[];
  };
  timestamp: Date;
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Verification methods
  addVerification(record: VerificationRecord): Promise<void>;
  getVerifications(filters?: { status?: string; startDate?: Date; endDate?: Date }): Promise<VerificationRecord[]>;
  getVerification(id: string): Promise<VerificationRecord | undefined>;

  // WorkScore evaluation snapshots
  addWorkScoreEvaluation(snapshot: WorkScoreEvaluationSnapshot): Promise<void>;
  getWorkScoreEvaluation(id: string): Promise<WorkScoreEvaluationSnapshot | undefined>;
  getWorkScoreEvaluations(limit?: number): Promise<WorkScoreEvaluationSnapshot[]>;
}

interface RecruiterStorageState {
  users: Array<[string, User]>;
  verifications: VerificationRecord[];
  workScoreEvaluations: WorkScoreEvaluationSnapshot[];
}

function parseDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return new Date();
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private verifications: VerificationRecord[];
  private workScoreEvaluations: WorkScoreEvaluationSnapshot[];

  constructor() {
    this.users = new Map();
    this.verifications = [];
    this.workScoreEvaluations = [];
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async addVerification(record: VerificationRecord): Promise<void> {
    this.verifications.unshift(record);
    if (this.verifications.length > 1000) {
      this.verifications.pop();
    }
  }

  async getVerifications(filters?: { status?: string; startDate?: Date; endDate?: Date }): Promise<VerificationRecord[]> {
    let results = [...this.verifications];

    if (filters?.status) {
      results = results.filter(r => r.status === filters.status);
    }
    if (filters?.startDate) {
      results = results.filter(r => r.timestamp >= filters.startDate!);
    }
    if (filters?.endDate) {
      results = results.filter(r => r.timestamp <= filters.endDate!);
    }

    return results;
  }

  async getVerification(id: string): Promise<VerificationRecord | undefined> {
    return this.verifications.find(r => r.id === id);
  }

  async addWorkScoreEvaluation(snapshot: WorkScoreEvaluationSnapshot): Promise<void> {
    this.workScoreEvaluations.unshift(snapshot);
    if (this.workScoreEvaluations.length > 5000) {
      this.workScoreEvaluations.pop();
    }
  }

  async getWorkScoreEvaluation(id: string): Promise<WorkScoreEvaluationSnapshot | undefined> {
    return this.workScoreEvaluations.find((row) => row.id === id);
  }

  async getWorkScoreEvaluations(limit = 50): Promise<WorkScoreEvaluationSnapshot[]> {
    const normalizedLimit = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : 50;
    return this.workScoreEvaluations.slice(0, Math.min(normalizedLimit, 200));
  }

  exportState(): RecruiterStorageState {
    return {
      users: Array.from(this.users.entries()),
      verifications: [...this.verifications],
      workScoreEvaluations: [...this.workScoreEvaluations],
    };
  }

  importState(state: RecruiterStorageState): void {
    this.users = new Map((state.users || []).map(([key, value]) => [key, {
      ...value,
      createdAt: parseDate((value as any).createdAt),
    }]));
    this.verifications = (state.verifications || []).map((row) => ({
      ...row,
      timestamp: parseDate((row as any).timestamp),
    }));
    this.workScoreEvaluations = (state.workScoreEvaluations || []).map((row) => ({
      ...row,
      timestamp: parseDate((row as any).timestamp),
    }));
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async addVerification(record: VerificationRecord): Promise<void> {
    await db.insert(verifications).values({
      ...record,
    });
  }

  async getVerifications(filters?: { status?: string; startDate?: Date; endDate?: Date }): Promise<VerificationRecord[]> {
    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(verifications.status, filters.status));
    }
    if (filters?.startDate) {
      conditions.push(gte(verifications.timestamp, filters.startDate!));
    }
    if (filters?.endDate) {
      conditions.push(lte(verifications.timestamp, filters.endDate!));
    }

    const result = await db
      .select()
      .from(verifications)
      .where(and(...conditions))
      .orderBy(desc(verifications.timestamp));

    return result as VerificationRecord[];
  }

  async getVerification(id: string): Promise<VerificationRecord | undefined> {
    const [record] = await db.select().from(verifications).where(eq(verifications.id, id));
    return record as VerificationRecord | undefined;
  }

  async addWorkScoreEvaluation(snapshot: WorkScoreEvaluationSnapshot): Promise<void> {
    await db.insert(workScoreEvaluations).values({
      id: snapshot.id,
      candidateHash: snapshot.candidate_hash,
      contextHash: snapshot.context_hash,
      score: snapshot.score,
      breakdown: snapshot.breakdown,
      decision: snapshot.decision,
      reasonCodes: snapshot.reason_codes,
      evidence: snapshot.evidence,
      timestamp: snapshot.timestamp,
    });
  }

  async getWorkScoreEvaluation(id: string): Promise<WorkScoreEvaluationSnapshot | undefined> {
    const [row] = await db.select().from(workScoreEvaluations).where(eq(workScoreEvaluations.id, id));
    if (!row) return undefined;

    return {
      id: row.id,
      candidate_hash: row.candidateHash || undefined,
      context_hash: row.contextHash || undefined,
      score: row.score,
      breakdown: row.breakdown as Record<string, number>,
      decision: row.decision,
      reason_codes: row.reasonCodes as string[],
      evidence: row.evidence as { summary: string; anchors_checked: string[]; docs_checked: string[] },
      timestamp: row.timestamp,
    };
  }

  async getWorkScoreEvaluations(limit = 50): Promise<WorkScoreEvaluationSnapshot[]> {
    const normalizedLimit = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : 50;
    const rows = await db
      .select()
      .from(workScoreEvaluations)
      .orderBy(desc(workScoreEvaluations.timestamp))
      .limit(Math.min(normalizedLimit, 200));

    return rows.map(row => ({
      id: row.id,
      candidate_hash: row.candidateHash || undefined,
      context_hash: row.contextHash || undefined,
      score: row.score,
      breakdown: row.breakdown as Record<string, number>,
      decision: row.decision,
      reason_codes: row.reasonCodes as string[],
      evidence: row.evidence as { summary: string; anchors_checked: string[]; docs_checked: string[] },
      timestamp: row.timestamp,
    }));
  }
}

const requirePersistentStorage =
  process.env.NODE_ENV === "production" || process.env.REQUIRE_DATABASE === "true";
const databaseUrl = process.env.DATABASE_URL;

if (requirePersistentStorage && !databaseUrl) {
  throw new Error(
    "[Storage] REQUIRE_DATABASE policy is enabled but DATABASE_URL is missing."
  );
}

// If a DATABASE_URL is present, we use the real database.
// Otherwise, we fallback to in-memory storage.
export const storage: IStorage = databaseUrl ? new DatabaseStorage() : new MemStorage();
