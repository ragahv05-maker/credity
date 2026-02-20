import {
  type User, type InsertUser,
  type Credential, type InsertCredential,
  type Activity, type InsertActivity,
  type OtpCode, type InsertOtpCode,
  type DeviceFingerprint,
  type ReputationEvent, type NewReputationEvent,
  type ReputationScore,
  type SafeDateScore,
} from "@shared/schema";
import { PostgresStateStore } from "@credverse/shared-auth";

export interface IStorage {
  // User
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;

  // Credentials
  getCredential(id: number): Promise<Credential | undefined>;
  listCredentials(userId: number): Promise<Credential[]>;
  createCredential(credential: InsertCredential): Promise<Credential>;

  // Activities
  listActivities(userId: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;

  // OTP codes
  createOtpCode(otp: InsertOtpCode): Promise<OtpCode>;
  getLatestOtpCode(identifier: string, purpose: string): Promise<OtpCode | undefined>;
  markOtpUsed(id: number): Promise<void>;
  countRecentOtps(identifier: string, purpose: string, windowMs: number): Promise<number>;

  // Device fingerprints
  storeDeviceFingerprint(userId: number, fingerprint: string, ipAddress?: string, userAgent?: string): Promise<void>;
  getDeviceFingerprint(fingerprint: string): Promise<DeviceFingerprint | undefined>;

  // User helpers
  getUserByEmail(email: string): Promise<User | undefined>;

  // Reputation Events
  upsertReputationEvent(event: NewReputationEvent): Promise<ReputationEvent>;
  getReputationEventsByUserId(userId: number): Promise<ReputationEvent[]>;
  getReputationEventByEventId(eventId: string): Promise<ReputationEvent | undefined>;

  // Reputation Scores
  getReputationScore(userId: number): Promise<ReputationScore | undefined>;
  upsertReputationScore(userId: number, data: Partial<ReputationScore>): Promise<ReputationScore>;

  // SafeDate Scores
  getSafeDateScore(userId: number): Promise<SafeDateScore | undefined>;
  upsertSafeDateScore(userId: number, data: Partial<SafeDateScore>): Promise<SafeDateScore>;

  // Test helpers
  clearReputationData(): Promise<void>;
}

interface WalletStorageState {
  users: Array<[number, User]>;
  credentials: Array<[number, Credential]>;
  activities: Array<[number, Activity]>;
  otpCodes: Array<[number, OtpCode]>;
  deviceFingerprints: Array<[number, DeviceFingerprint]>;
  reputationEvents: Array<[number, ReputationEvent]>;
  reputationScores: Array<[number, ReputationScore]>;
  safeDateScores: Array<[number, SafeDateScore]>;
  currentUserId: number;
  currentCredentialId: number;
  currentActivityId: number;
  currentOtpId: number;
  currentFingerprintId: number;
  currentRepEventId: number;
  currentRepScoreId: number;
  currentSafeDateScoreId: number;
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
  private users: Map<number, User>;
  private credentials: Map<number, Credential>;
  private activities: Map<number, Activity>;
  private otpCodes: Map<number, OtpCode>;
  private deviceFPs: Map<number, DeviceFingerprint>;
  private repEvents: Map<number, ReputationEvent>;
  private repScores: Map<number, ReputationScore>;
  private sdScores: Map<number, SafeDateScore>;
  private currentUserId: number;
  private currentCredentialId: number;
  private currentActivityId: number;
  private currentOtpId: number;
  private currentFingerprintId: number;
  private currentRepEventId: number;
  private currentRepScoreId: number;
  private currentSafeDateScoreId: number;

  constructor() {
    this.users = new Map();
    this.credentials = new Map();
    this.activities = new Map();
    this.otpCodes = new Map();
    this.deviceFPs = new Map();
    this.repEvents = new Map();
    this.repScores = new Map();
    this.sdScores = new Map();
    this.currentUserId = 1;
    this.currentCredentialId = 1;
    this.currentActivityId = 1;
    this.currentOtpId = 1;
    this.currentFingerprintId = 1;
    this.currentRepEventId = 1;
    this.currentRepScoreId = 1;
    this.currentSafeDateScoreId = 1;
  }

  // User
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = {
      ...insertUser,
      id,
      did: insertUser.did ?? null,
      name: insertUser.name ?? null,
      email: insertUser.email ?? null,
      bio: insertUser.bio ?? null,
      avatarUrl: insertUser.avatarUrl ?? null,
      phoneNumber: insertUser.phoneNumber ?? null,
      phoneVerified: insertUser.phoneVerified ?? false,
      emailVerified: insertUser.emailVerified ?? false,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
    const user = await this.getUser(id);
    if (!user) throw new Error("User not found");

    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Credentials
  async getCredential(id: number): Promise<Credential | undefined> {
    return this.credentials.get(id);
  }

  async listCredentials(userId: number): Promise<Credential[]> {
    return Array.from(this.credentials.values()).filter(
      (c) => c.userId === userId && !c.isArchived
    );
  }

  async createCredential(insertCredential: InsertCredential): Promise<Credential> {
    const id = this.currentCredentialId++;
    const credential: Credential = {
      ...insertCredential,
      id,
      jwt: insertCredential.jwt ?? null,
      isArchived: insertCredential.isArchived ?? false
    };
    this.credentials.set(id, credential);
    return credential;
  }

  // Activities
  async listActivities(userId: number): Promise<Activity[]> {
    return Array.from(this.activities.values())
      .filter((a) => a.userId === userId)
      .sort((a, b) => (b.timestamp?.getTime() ?? 0) - (a.timestamp?.getTime() ?? 0));
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const id = this.currentActivityId++;
    const activity: Activity = {
      ...insertActivity,
      id,
      timestamp: new Date()
    };
    this.activities.set(id, activity);
    return activity;
  }

  // OTP codes
  async createOtpCode(otp: InsertOtpCode): Promise<OtpCode> {
    const id = this.currentOtpId++;
    const record: OtpCode = {
      id,
      userId: otp.userId ?? null,
      identifier: otp.identifier,
      code: otp.code,
      purpose: otp.purpose,
      expiresAt: otp.expiresAt,
      usedAt: null,
      createdAt: new Date(),
    };
    this.otpCodes.set(id, record);
    return record;
  }

  async getLatestOtpCode(identifier: string, purpose: string): Promise<OtpCode | undefined> {
    return Array.from(this.otpCodes.values())
      .filter((o) => o.identifier === identifier && o.purpose === purpose && !o.usedAt)
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
      [0];
  }

  async markOtpUsed(id: number): Promise<void> {
    const rec = this.otpCodes.get(id);
    if (rec) this.otpCodes.set(id, { ...rec, usedAt: new Date() });
  }

  async countRecentOtps(identifier: string, purpose: string, windowMs: number): Promise<number> {
    const cutoff = new Date(Date.now() - windowMs);
    return Array.from(this.otpCodes.values()).filter(
      (o) =>
        o.identifier === identifier &&
        o.purpose === purpose &&
        !o.usedAt &&
        (o.createdAt ?? new Date(0)) >= cutoff,
    ).length;
  }

  // Device fingerprints
  async storeDeviceFingerprint(
    userId: number,
    fingerprint: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const existing = Array.from(this.deviceFPs.values()).find((f) => f.fingerprint === fingerprint);
    if (existing) {
      this.deviceFPs.set(existing.id, { ...existing, lastSeenAt: new Date() });
      return;
    }
    const id = this.currentFingerprintId++;
    this.deviceFPs.set(id, {
      id,
      userId,
      fingerprint,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      createdAt: new Date(),
      lastSeenAt: new Date(),
    });
  }

  async getDeviceFingerprint(fingerprint: string): Promise<DeviceFingerprint | undefined> {
    return Array.from(this.deviceFPs.values()).find((f) => f.fingerprint === fingerprint);
  }

  // User helpers
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((u) => u.email === email);
  }

  // Reputation Events
  async upsertReputationEvent(event: NewReputationEvent): Promise<ReputationEvent> {
    // Check if event with this eventId (dedup key) already exists
    const existing = Array.from(this.repEvents.values()).find((e) => e.eventId === event.eventId);
    if (existing) {
      const updated: ReputationEvent = { ...existing, ...event, id: existing.id, createdAt: existing.createdAt };
      this.repEvents.set(existing.id, updated);
      return updated;
    }
    const id = this.currentRepEventId++;
    const record: ReputationEvent = {
      id,
      userId: event.userId,
      eventId: event.eventId,
      platform: event.platform,
      category: event.category,
      signalType: event.signalType,
      score: event.score,
      weight: event.weight,
      decayFactor: event.decayFactor ?? null,
      metadata: event.metadata ?? null,
      eventDate: event.eventDate,
      createdAt: new Date(),
    };
    this.repEvents.set(id, record);
    return record;
  }

  async getReputationEventsByUserId(userId: number): Promise<ReputationEvent[]> {
    return Array.from(this.repEvents.values()).filter((e) => e.userId === userId);
  }

  async getReputationEventByEventId(eventId: string): Promise<ReputationEvent | undefined> {
    return Array.from(this.repEvents.values()).find((e) => e.eventId === eventId);
  }

  // Reputation Scores
  async getReputationScore(userId: number): Promise<ReputationScore | undefined> {
    return Array.from(this.repScores.values()).find((s) => s.userId === userId);
  }

  async upsertReputationScore(userId: number, data: Partial<ReputationScore>): Promise<ReputationScore> {
    const existing = Array.from(this.repScores.values()).find((s) => s.userId === userId);
    if (existing) {
      const updated: ReputationScore = { ...existing, ...data, id: existing.id, userId, updatedAt: new Date() };
      this.repScores.set(existing.id, updated);
      return updated;
    }
    const id = this.currentRepScoreId++;
    const record: ReputationScore = {
      id,
      userId,
      rawScore: data.rawScore ?? 500,
      normalizedScore: data.normalizedScore ?? 500,
      categoryBreakdown: data.categoryBreakdown ?? null,
      eventCount: data.eventCount ?? 0,
      lastCalculatedAt: data.lastCalculatedAt ?? new Date(),
      updatedAt: new Date(),
    };
    this.repScores.set(id, record);
    return record;
  }

  // SafeDate Scores
  async getSafeDateScore(userId: number): Promise<SafeDateScore | undefined> {
    return Array.from(this.sdScores.values()).find((s) => s.userId === userId);
  }

  async upsertSafeDateScore(userId: number, data: Partial<SafeDateScore>): Promise<SafeDateScore> {
    const existing = Array.from(this.sdScores.values()).find((s) => s.userId === userId);
    if (existing) {
      const updated: SafeDateScore = { ...existing, ...data, id: existing.id, userId, calculatedAt: new Date() };
      this.sdScores.set(existing.id, updated);
      return updated;
    }
    const id = this.currentSafeDateScoreId++;
    const record: SafeDateScore = {
      id,
      userId,
      score: data.score ?? 50,
      trustLevel: data.trustLevel ?? null,
      inputs: data.inputs ?? null,
      calculatedAt: new Date(),
    };
    this.sdScores.set(id, record);
    return record;
  }

  // Test helpers
  async clearReputationData(): Promise<void> {
    this.repEvents.clear();
    this.repScores.clear();
    this.sdScores.clear();
  }

  exportState(): WalletStorageState {
    return {
      users: Array.from(this.users.entries()),
      credentials: Array.from(this.credentials.entries()),
      activities: Array.from(this.activities.entries()),
      otpCodes: Array.from(this.otpCodes.entries()),
      deviceFingerprints: Array.from(this.deviceFPs.entries()),
      reputationEvents: Array.from(this.repEvents.entries()),
      reputationScores: Array.from(this.repScores.entries()),
      safeDateScores: Array.from(this.sdScores.entries()),
      currentUserId: this.currentUserId,
      currentCredentialId: this.currentCredentialId,
      currentActivityId: this.currentActivityId,
      currentOtpId: this.currentOtpId,
      currentFingerprintId: this.currentFingerprintId,
      currentRepEventId: this.currentRepEventId,
      currentRepScoreId: this.currentRepScoreId,
      currentSafeDateScoreId: this.currentSafeDateScoreId,
    };
  }

  importState(state: WalletStorageState): void {
    this.users = new Map((state.users || []).map(([key, value]) => [key, value]));
    this.credentials = new Map((state.credentials || []).map(([key, value]) => [key, {
      ...value,
      issuanceDate: parseDate((value as any).issuanceDate),
    }]));
    this.activities = new Map((state.activities || []).map(([key, value]) => [key, {
      ...value,
      timestamp: parseDate((value as any).timestamp),
    }]));
    this.otpCodes = new Map((state.otpCodes || []).map(([key, value]) => [key, {
      ...value,
      expiresAt: parseDate((value as any).expiresAt),
      createdAt: value.createdAt ? parseDate((value as any).createdAt) : null,
      usedAt: value.usedAt ? parseDate((value as any).usedAt) : null,
    }]));
    this.deviceFPs = new Map((state.deviceFingerprints || []).map(([key, value]) => [key, value]));
    this.repEvents = new Map((state.reputationEvents || []).map(([key, value]) => [key, {
      ...value,
      eventDate: parseDate((value as any).eventDate),
      createdAt: value.createdAt ? parseDate((value as any).createdAt) : null,
    }]));
    this.repScores = new Map((state.reputationScores || []).map(([key, value]) => [key, {
      ...value,
      lastCalculatedAt: value.lastCalculatedAt ? parseDate((value as any).lastCalculatedAt) : null,
      updatedAt: value.updatedAt ? parseDate((value as any).updatedAt) : null,
    }]));
    this.sdScores = new Map((state.safeDateScores || []).map(([key, value]) => [key, {
      ...value,
      calculatedAt: value.calculatedAt ? parseDate((value as any).calculatedAt) : null,
    }]));
    this.currentUserId = state.currentUserId || 1;
    this.currentCredentialId = state.currentCredentialId || 1;
    this.currentActivityId = state.currentActivityId || 1;
    this.currentOtpId = state.currentOtpId || 1;
    this.currentFingerprintId = state.currentFingerprintId || 1;
    this.currentRepEventId = state.currentRepEventId || 1;
    this.currentRepScoreId = state.currentRepScoreId || 1;
    this.currentSafeDateScoreId = state.currentSafeDateScoreId || 1;
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

function createPersistedStorage(base: MemStorage, dbUrl?: string): MemStorage {
  if (!dbUrl) {
    return base;
  }

  const stateStore = new PostgresStateStore<WalletStorageState>({
    databaseUrl: dbUrl,
    serviceKey: "wallet-storage",
  });

  let hydrated = false;
  let hydrationPromise: Promise<void> | null = null;
  let persistChain = Promise.resolve();
  const mutatingPrefixes = ["create", "update", "delete", "revoke", "bulk", "store", "mark", "upsert", "clear"];

  const ensureHydrated = async () => {
    if (hydrated) return;
    if (!hydrationPromise) {
      hydrationPromise = (async () => {
        const loaded = await stateStore.load();
        if (loaded) {
          base.importState(loaded);
        } else {
          await stateStore.save(base.exportState());
        }
        hydrated = true;
      })();
    }
    await hydrationPromise;
  };

  const queuePersist = async () => {
    persistChain = persistChain
      .then(async () => {
        await stateStore.save(base.exportState());
      })
      .catch((error) => {
        console.error("[Storage] Failed to persist wallet state:", error);
      });
    await persistChain;
  };

  return new Proxy(base, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function") {
        return value;
      }

      return async (...args: unknown[]) => {
        await ensureHydrated();
        const result = await value.apply(target, args);
        const shouldPersist = mutatingPrefixes.some(
          (prefix) => typeof prop === "string" && prop.startsWith(prefix),
        );
        if (shouldPersist) {
          await queuePersist();
        }
        return result;
      };
    },
  }) as MemStorage;
}

export const storage = createPersistedStorage(new MemStorage(), databaseUrl);
