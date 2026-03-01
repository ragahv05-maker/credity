import {
  type User, type InsertUser,
  type Tenant, type InsertTenant,
  type ApiKey, type InsertApiKey,
  type Issuer, type InsertIssuer,
  type Template, type InsertTemplate,
  type Credential, type InsertCredential
} from "@shared/schema";
import * as schema from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

// Extended types for full functionality
export interface Student {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  studentId: string;
  program: string;
  enrollmentYear: string;
  status: "Active" | "Alumni" | "Suspended";
  createdAt: Date;
}

export interface TeamMember {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: "Admin" | "Issuer" | "Viewer";
  status: "Active" | "Pending" | "Inactive";
  invitedAt: Date;
  joinedAt: Date | null;
}

export interface VerificationLog {
  id: string;
  tenantId: string;
  credentialId: string;
  verifierName: string;
  verifierLocation: string;
  timestamp: Date;
  status: "success" | "failed" | "suspicious";
  ipAddress: string;
}

export interface TemplateField {
  id: string;
  type: "text" | "image" | "signature" | "qrcode" | "date" | "table";
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  properties: Record<string, any>;
}

export interface TemplateDesign {
  id: string;
  tenantId: string;
  name: string;
  category: string;
  type: string;
  status: "Active" | "Draft" | "Archived";
  fields: TemplateField[];
  backgroundColor: string;
  width: number;
  height: number;
  createdAt: Date;
  updatedAt: Date;
}

interface IssuerStorageState {
  users: Array<[string, User]>;
  tenants: Array<[string, Tenant]>;
  apiKeys: Array<[string, ApiKey]>;
  issuers: Array<[string, Issuer]>;
  templates: Array<[string, Template]>;
  credentials: Array<[string, Credential]>;
  students: Array<[string, Student]>;
  teamMembers: Array<[string, TeamMember]>;
  verificationLogs: Array<[string, VerificationLog]>;
  templateDesigns: Array<[string, TemplateDesign]>;
  activityLogs: Array<[string, any]>;
}

function parseDate(value: unknown, fallback = new Date()): Date {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return fallback;
}

export interface IStorage {
  // User
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Tenant
  getTenant(id: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;

  // API Key
  getApiKey(keyHash: string): Promise<ApiKey | undefined>;
  createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;

  // Issuer
  getIssuer(id: string): Promise<Issuer | undefined>;
  getIssuerByDid(did: string): Promise<Issuer | undefined>;
  createIssuer(issuer: InsertIssuer): Promise<Issuer>;
  listIssuers(tenantId: string): Promise<Issuer[]>;

  // Template
  getTemplate(id: string): Promise<Template | undefined>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  listTemplates(tenantId: string): Promise<Template[]>;

  // Credential
  getCredential(id: string): Promise<Credential | undefined>;
  getCredentialByVcJwt(vcJwt: string): Promise<Credential | undefined>;
  createCredential(credential: InsertCredential): Promise<Credential>;
  listCredentials(tenantId: string): Promise<Credential[]>;
  revokeCredential(id: string): Promise<void>;
  updateCredentialBlockchain(id: string, data: { txHash?: string; blockNumber?: number; credentialHash?: string }): Promise<void>;

  // Activity Log
  createActivityLog(data: { tenantId: string; type: string; title: string; description: string; metadata?: any }): Promise<void>;

  // Students
  listStudents(tenantId: string): Promise<Student[]>;
  getStudent(id: string): Promise<Student | undefined>;
  createStudent(data: Omit<Student, "id" | "createdAt">): Promise<Student>;
  updateStudent(id: string, data: Partial<Student>): Promise<Student | undefined>;
  deleteStudent(id: string): Promise<boolean>;
  bulkCreateStudents(students: Omit<Student, "id" | "createdAt">[]): Promise<Student[]>;

  // Team Members
  listTeamMembers(tenantId: string): Promise<TeamMember[]>;
  getTeamMember(id: string): Promise<TeamMember | undefined>;
  createTeamMember(data: Omit<TeamMember, "id" | "invitedAt" | "joinedAt">): Promise<TeamMember>;
  updateTeamMember(id: string, data: Partial<TeamMember>): Promise<TeamMember | undefined>;
  deleteTeamMember(id: string): Promise<boolean>;

  // Verification Logs
  listVerificationLogs(tenantId: string): Promise<VerificationLog[]>;
  createVerificationLog(data: {
    tenantId: string;
    credentialId: string;
    verifierName: string;
    verifierIp: string;
    location: string;
    status: "verified" | "failed" | "suspicious";
    reason?: string;
  }): Promise<VerificationLog>;
  getVerificationStats(tenantId: string): Promise<{ total: number; today: number; suspicious: number }>;

  // Template Designs
  listTemplateDesigns(tenantId: string): Promise<TemplateDesign[]>;
  getTemplateDesign(id: string): Promise<TemplateDesign | undefined>;
  createTemplateDesign(data: Omit<TemplateDesign, "id" | "createdAt" | "updatedAt">): Promise<TemplateDesign>;
  updateTemplateDesign(id: string, data: Partial<TemplateDesign>): Promise<TemplateDesign | undefined>;
  deleteTemplateDesign(id: string): Promise<boolean>;
  duplicateTemplateDesign(id: string): Promise<TemplateDesign | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private tenants: Map<string, Tenant>;
  private apiKeys: Map<string, ApiKey>;
  private issuers: Map<string, Issuer>;
  private templates: Map<string, Template>;
  private credentials: Map<string, Credential>;

  // New collections
  private students: Map<string, Student>;
  private teamMembers: Map<string, TeamMember>;
  private verificationLogs: Map<string, VerificationLog>;
  private templateDesigns: Map<string, TemplateDesign>;
  private activityLogs: Map<string, any>;

  constructor() {
    this.users = new Map();
    this.tenants = new Map();
    this.apiKeys = new Map();
    this.issuers = new Map();
    this.templates = new Map();
    this.credentials = new Map();
    this.students = new Map();
    this.teamMembers = new Map();
    this.verificationLogs = new Map();
    this.templateDesigns = new Map();
    this.activityLogs = new Map();

    // Seed default data for MVP
    this.seedDefaultData();
  }

  private seedDefaultData() {
    const tenantId = "550e8400-e29b-41d4-a716-446655440000";
    this.tenants.set(tenantId, {
      id: tenantId,
      name: "Demo University",
      plan: "pro",
      createdAt: new Date(),
    });

    // Seed API key only for explicit bootstrap/test use.
    const isTestEnv = process.env.NODE_ENV === "test" || process.env.VITEST === "true";
    const bootstrapApiKey = process.env.ISSUER_BOOTSTRAP_API_KEY || (isTestEnv ? "test-api-key" : null);
    if (bootstrapApiKey) {
      this.apiKeys.set("key-1", {
        id: "key-1",
        tenantId: tenantId,
        keyHash: bootstrapApiKey,
        permissions: ["all"],
        expiresAt: null,
        createdAt: new Date()
      });
    }

    // Seed Students
    const sampleStudents: Omit<Student, "id" | "createdAt">[] = [
      { tenantId, name: "Aditi Sharma", email: "aditi.sharma@email.com", studentId: "STU-001", program: "B.Tech Computer Science", enrollmentYear: "2021", status: "Active" },
      { tenantId, name: "Rahul Gupta", email: "rahul.g@email.com", studentId: "STU-002", program: "MBA Finance", enrollmentYear: "2022", status: "Active" },
      { tenantId, name: "Priya Singh", email: "priya.s@email.com", studentId: "STU-003", program: "B.Tech Electronics", enrollmentYear: "2020", status: "Alumni" },
      { tenantId, name: "Vikram Patel", email: "vikram.p@email.com", studentId: "STU-004", program: "M.Tech AI/ML", enrollmentYear: "2023", status: "Active" },
      { tenantId, name: "Sneha Reddy", email: "sneha.r@email.com", studentId: "STU-005", program: "B.Com Honors", enrollmentYear: "2021", status: "Active" },
    ];
    sampleStudents.forEach((s, i) => {
      const id = `student-${i + 1}`;
      this.students.set(id, { ...s, id, createdAt: new Date() });
    });

    // Seed Team Members
    const sampleTeam: Omit<TeamMember, "id" | "invitedAt" | "joinedAt">[] = [
      { tenantId, name: "Admin User", email: "admin@university.edu", role: "Admin", status: "Active" },
      { tenantId, name: "Sarah Jenkins", email: "sarah.j@university.edu", role: "Issuer", status: "Active" },
      { tenantId, name: "Dr. K. Mehta", email: "dean.academics@university.edu", role: "Issuer", status: "Active" },
      { tenantId, name: "Registrar Office", email: "registrar@university.edu", role: "Viewer", status: "Active" },
    ];
    sampleTeam.forEach((t, i) => {
      const id = `team-${i + 1}`;
      this.teamMembers.set(id, { ...t, id, invitedAt: new Date(), joinedAt: new Date() });
    });

    // Seed Default Issuer (Demo University)
    const demoIssuer: Issuer = {
      id: "issuer-1",
      did: "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnn3Zua2F72",
      name: "Demo University",
      domain: "university.edu",
      trustStatus: "trusted",
      meta: { logo: "https://via.placeholder.com/50", description: "Official Demo University Issuer" },
      tenantId: tenantId,
      createdAt: new Date()
    };
    this.issuers.set(demoIssuer.id, demoIssuer);

    // Seed Template Designs
    const sampleTemplates: Omit<TemplateDesign, "id" | "createdAt" | "updatedAt">[] = [
      { tenantId, name: "Degree Certificate 2025", category: "Education", type: "A4 Landscape", status: "Active", fields: [], backgroundColor: "#ffffff", width: 842, height: 595 },
      { tenantId, name: "Semester Grade Card", category: "Education", type: "A4 Portrait", status: "Active", fields: [], backgroundColor: "#ffffff", width: 595, height: 842 },
      { tenantId, name: "Course Completion", category: "Education", type: "Letter Landscape", status: "Draft", fields: [], backgroundColor: "#ffffff", width: 792, height: 612 },
      { tenantId, name: "Medical Lab Report", category: "Healthcare", type: "A4 Portrait", status: "Active", fields: [], backgroundColor: "#ffffff", width: 595, height: 842 },
      { tenantId, name: "ISO 9001 Compliance", category: "Manufacturing", type: "Certificate", status: "Active", fields: [], backgroundColor: "#ffffff", width: 842, height: 595 },
      { tenantId, name: "Employee ID Card", category: "Corporate", type: "ID Card", status: "Active", fields: [], backgroundColor: "#ffffff", width: 324, height: 204 },
    ];
    sampleTemplates.forEach((t, i) => {
      const id = `template-design-${i + 1}`;
      this.templateDesigns.set(id, { ...t, id, createdAt: new Date(), updatedAt: new Date() });
    });

    // Verification logs - no seed data, only real verifications will appear

    // Sync template designs to 'templates' collection for legacy compatibility
    // This ensures /api/v1/templates returns data for the Issuance dropdown
    sampleTemplates.forEach((t, i) => {
      const id = `template-${i + 1}`;
      this.templates.set(id, {
        id,
        tenantId: t.tenantId,
        name: t.name,
        createdAt: new Date(),
        version: "1.0.0",
        schema: "credential-schema-v1",
        disclosure: {}
      } as any);
    });
  }


  // User
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
    const user: User = { ...insertUser, id, role: insertUser.role || "user", tenantId: insertUser.tenantId || null, createdAt: new Date() };
    this.users.set(id, user);
    return user;
  }

  // Tenant
  async getTenant(id: string): Promise<Tenant | undefined> {
    return this.tenants.get(id);
  }

  async createTenant(insertTenant: InsertTenant): Promise<Tenant> {
    const id = randomUUID();
    const tenant: Tenant = { ...insertTenant, id, createdAt: new Date(), plan: "free" };
    this.tenants.set(id, tenant);
    return tenant;
  }

  // API Key
  async getApiKey(keyHash: string): Promise<ApiKey | undefined> {
    return Array.from(this.apiKeys.values()).find(
      (key) => key.keyHash === keyHash
    );
  }

  async createApiKey(insertApiKey: InsertApiKey): Promise<ApiKey> {
    const id = randomUUID();
    const apiKey: ApiKey = {
      ...insertApiKey,
      id,
      createdAt: new Date(),
      permissions: insertApiKey.permissions ?? [],
      expiresAt: insertApiKey.expiresAt ?? null
    };
    this.apiKeys.set(id, apiKey);
    return apiKey;
  }

  // Issuer
  async getIssuer(id: string): Promise<Issuer | undefined> {
    return this.issuers.get(id);
  }

  async getIssuerByDid(did: string): Promise<Issuer | undefined> {
    return Array.from(this.issuers.values()).find(i => i.did === did);
  }

  async createIssuer(insertIssuer: InsertIssuer): Promise<Issuer> {
    const id = randomUUID();
    const issuer: Issuer = {
      id,
      name: insertIssuer.name,
      tenantId: insertIssuer.tenantId,
      domain: insertIssuer.domain,
      did: insertIssuer.did ?? null,
      trustStatus: "pending",
      meta: insertIssuer.meta ?? null,
      createdAt: new Date()
    };
    this.issuers.set(id, issuer);
    return issuer;
  }

  async listIssuers(tenantId: string): Promise<Issuer[]> {
    return Array.from(this.issuers.values()).filter(
      (issuer) => issuer.tenantId === tenantId
    );
  }

  // Template (original schema)
  async getTemplate(id: string): Promise<Template | undefined> {
    return this.templates.get(id);
  }

  async createTemplate(insertTemplate: InsertTemplate): Promise<Template> {
    const id = randomUUID();
    const template: Template = {
      ...insertTemplate,
      id,
      createdAt: new Date(),
      version: insertTemplate.version ?? "1.0.0",
      disclosure: insertTemplate.disclosure ?? {}
    };
    this.templates.set(id, template);
    return template;
  }

  async listTemplates(tenantId: string): Promise<Template[]> {
    return Array.from(this.templates.values()).filter(
      (template) => template.tenantId === tenantId
    );
  }

  // Credential
  async getCredential(id: string): Promise<Credential | undefined> {
    return this.credentials.get(id);
  }

  async getCredentialByVcJwt(vcJwt: string): Promise<Credential | undefined> {
    return Array.from(this.credentials.values()).find((credential) => credential.vcJwt === vcJwt);
  }

  async createCredential(insertCredential: InsertCredential): Promise<Credential> {
    const id = randomUUID();
    const credential: Credential = {
      ...insertCredential,
      id,
      createdAt: new Date(),
      format: (insertCredential as any).format ?? "vc+jwt",
      issuerDid: (insertCredential as any).issuerDid ?? null,
      subjectDid: (insertCredential as any).subjectDid ?? null,
      statusListId: (insertCredential as any).statusListId ?? null,
      statusListIndex: (insertCredential as any).statusListIndex ?? null,
      anchorBatchId: (insertCredential as any).anchorBatchId ?? null,
      anchorProof: (insertCredential as any).anchorProof ?? null,
      holderBinding: (insertCredential as any).holderBinding ?? null,
      issuanceFlow: (insertCredential as any).issuanceFlow ?? "legacy",
      vcJwt: insertCredential.vcJwt ?? null,
      ipfsHash: insertCredential.ipfsHash ?? null,
      anchorId: insertCredential.anchorId ?? null,
      revoked: false,
      txHash: null,
      blockNumber: null,
      credentialHash: null
    };
    this.credentials.set(id, credential);
    return credential;
  }

  async listCredentials(tenantId: string): Promise<Credential[]> {
    return Array.from(this.credentials.values()).filter(
      (credential) => credential.tenantId === tenantId
    );
  }

  async revokeCredential(id: string): Promise<void> {
    const credential = this.credentials.get(id);
    if (credential) {
      credential.revoked = true;
      this.credentials.set(id, credential);
    }
  }

  async updateCredentialBlockchain(id: string, data: { txHash?: string; blockNumber?: number; credentialHash?: string }): Promise<void> {
    const credential = this.credentials.get(id);
    if (credential) {
      (credential as any).txHash = data.txHash;
      (credential as any).blockNumber = data.blockNumber;
      (credential as any).credentialHash = data.credentialHash;
      this.credentials.set(id, credential);
    }
  }

  async createActivityLog(data: { tenantId: string; type: string; title: string; description: string; metadata?: any }): Promise<void> {
    const id = randomUUID();
    const log = {
      id,
      ...data,
      timestamp: new Date(),
    };
    this.activityLogs.set(id, log);
  }

  // ==================== STUDENTS ====================
  async listStudents(tenantId: string): Promise<Student[]> {
    return Array.from(this.students.values()).filter(s => s.tenantId === tenantId);
  }

  async getStudent(id: string): Promise<Student | undefined> {
    return this.students.get(id);
  }

  async createStudent(data: Omit<Student, "id" | "createdAt">): Promise<Student> {
    const id = randomUUID();
    const student: Student = { ...data, id, createdAt: new Date() };
    this.students.set(id, student);
    return student;
  }

  async updateStudent(id: string, data: Partial<Student>): Promise<Student | undefined> {
    const student = this.students.get(id);
    if (!student) return undefined;
    const updated = { ...student, ...data };
    this.students.set(id, updated);
    return updated;
  }

  async deleteStudent(id: string): Promise<boolean> {
    return this.students.delete(id);
  }

  async bulkCreateStudents(students: Omit<Student, "id" | "createdAt">[]): Promise<Student[]> {
    return Promise.all(students.map(s => this.createStudent(s)));
  }

  // ==================== TEAM MEMBERS ====================
  async listTeamMembers(tenantId: string): Promise<TeamMember[]> {
    return Array.from(this.teamMembers.values()).filter(t => t.tenantId === tenantId);
  }

  async getTeamMember(id: string): Promise<TeamMember | undefined> {
    return this.teamMembers.get(id);
  }

  async createTeamMember(data: Omit<TeamMember, "id" | "invitedAt" | "joinedAt">): Promise<TeamMember> {
    const id = randomUUID();
    const member: TeamMember = { ...data, id, invitedAt: new Date(), joinedAt: null, status: "Pending" };
    this.teamMembers.set(id, member);
    return member;
  }

  async updateTeamMember(id: string, data: Partial<TeamMember>): Promise<TeamMember | undefined> {
    const member = this.teamMembers.get(id);
    if (!member) return undefined;
    const updated = { ...member, ...data };
    this.teamMembers.set(id, updated);
    return updated;
  }

  async deleteTeamMember(id: string): Promise<boolean> {
    return this.teamMembers.delete(id);
  }

  // ==================== VERIFICATION LOGS ====================
  async listVerificationLogs(tenantId: string): Promise<VerificationLog[]> {
    return Array.from(this.verificationLogs.values())
      .filter(l => l.tenantId === tenantId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async createVerificationLog(data: {
    tenantId: string;
    credentialId: string;
    verifierName: string;
    verifierIp: string;
    location: string;
    status: "verified" | "failed" | "suspicious";
    reason?: string;
  }): Promise<VerificationLog> {
    const id = randomUUID();
    const log: VerificationLog = {
      id,
      tenantId: data.tenantId,
      credentialId: data.credentialId,
      verifierName: data.verifierName,
      verifierLocation: data.location,
      timestamp: new Date(),
      status: data.status === "verified" ? "success" : data.status,
      ipAddress: data.verifierIp,
    };
    this.verificationLogs.set(id, log);
    return log;
  }


  async getVerificationStats(tenantId: string): Promise<{ total: number; today: number; suspicious: number }> {
    const logs = await this.listVerificationLogs(tenantId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
      total: logs.length,
      today: logs.filter(l => l.timestamp >= today).length,
      suspicious: logs.filter(l => l.status === "suspicious").length
    };
  }

  // ==================== TEMPLATE DESIGNS ====================
  async listTemplateDesigns(tenantId: string): Promise<TemplateDesign[]> {
    return Array.from(this.templateDesigns.values()).filter(t => t.tenantId === tenantId);
  }

  async getTemplateDesign(id: string): Promise<TemplateDesign | undefined> {
    return this.templateDesigns.get(id);
  }

  async createTemplateDesign(data: Omit<TemplateDesign, "id" | "createdAt" | "updatedAt">): Promise<TemplateDesign> {
    const id = randomUUID();
    const now = new Date();
    const template: TemplateDesign = { ...data, id, createdAt: now, updatedAt: now };
    this.templateDesigns.set(id, template);
    return template;
  }

  async updateTemplateDesign(id: string, data: Partial<TemplateDesign>): Promise<TemplateDesign | undefined> {
    const template = this.templateDesigns.get(id);
    if (!template) return undefined;
    const updated = { ...template, ...data, updatedAt: new Date() };
    this.templateDesigns.set(id, updated);
    return updated;
  }

  async deleteTemplateDesign(id: string): Promise<boolean> {
    return this.templateDesigns.delete(id);
  }

  async duplicateTemplateDesign(id: string): Promise<TemplateDesign | undefined> {
    const original = this.templateDesigns.get(id);
    if (!original) return undefined;
    const newId = randomUUID();
    const now = new Date();
    const duplicate: TemplateDesign = {
      ...original,
      id: newId,
      name: `${original.name} (Copy)`,
      status: "Draft",
      createdAt: now,
      updatedAt: now
    };
    this.templateDesigns.set(newId, duplicate);
    return duplicate;
  }

  exportState(): IssuerStorageState {
    return {
      users: Array.from(this.users.entries()),
      tenants: Array.from(this.tenants.entries()),
      apiKeys: Array.from(this.apiKeys.entries()),
      issuers: Array.from(this.issuers.entries()),
      templates: Array.from(this.templates.entries()),
      credentials: Array.from(this.credentials.entries()),
      students: Array.from(this.students.entries()),
      teamMembers: Array.from(this.teamMembers.entries()),
      verificationLogs: Array.from(this.verificationLogs.entries()),
      templateDesigns: Array.from(this.templateDesigns.entries()),
      activityLogs: Array.from(this.activityLogs.entries()),
    };
  }

  importState(state: IssuerStorageState): void {
    this.users = new Map((state.users || []).map(([key, value]) => [key, {
      ...value,
      createdAt: parseDate((value as any).createdAt),
    }]));
    this.tenants = new Map((state.tenants || []).map(([key, value]) => [key, {
      ...value,
      createdAt: parseDate((value as any).createdAt),
    }]));
    this.apiKeys = new Map((state.apiKeys || []).map(([key, value]) => [key, {
      ...value,
      createdAt: parseDate((value as any).createdAt),
      expiresAt: (value as any).expiresAt ? parseDate((value as any).expiresAt) : null,
    }]));
    this.issuers = new Map((state.issuers || []).map(([key, value]) => [key, {
      ...value,
      createdAt: parseDate((value as any).createdAt),
    }]));
    this.templates = new Map((state.templates || []).map(([key, value]) => [key, {
      ...value,
      createdAt: parseDate((value as any).createdAt),
    }]));
    this.credentials = new Map((state.credentials || []).map(([key, value]) => [key, {
      ...value,
      createdAt: parseDate((value as any).createdAt),
    }]));
    this.students = new Map((state.students || []).map(([key, value]) => [key, {
      ...value,
      createdAt: parseDate((value as any).createdAt),
    }]));
    this.teamMembers = new Map((state.teamMembers || []).map(([key, value]) => [key, {
      ...value,
      invitedAt: parseDate((value as any).invitedAt),
      joinedAt: (value as any).joinedAt ? parseDate((value as any).joinedAt) : null,
    }]));
    this.verificationLogs = new Map((state.verificationLogs || []).map(([key, value]) => [key, {
      ...value,
      timestamp: parseDate((value as any).timestamp),
    }]));
    this.templateDesigns = new Map((state.templateDesigns || []).map(([key, value]) => [key, {
      ...value,
      createdAt: parseDate((value as any).createdAt),
      updatedAt: parseDate((value as any).updatedAt),
    }]));
    this.activityLogs = new Map((state.activityLogs || []).map(([key, value]) => [key, {
      ...value,
      timestamp: (value as any)?.timestamp ? parseDate((value as any).timestamp) : parseDate(undefined),
    }]));
  }
}

export class DbStorage implements IStorage {
  // User
  async getUser(id: string): Promise<User | undefined> {
    if (!db) return undefined;
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (!db) return undefined;
    const [user] = await db.select().from(schema.users).where(eq(schema.users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    if (!db) throw new Error("Database not connected");
    const [user] = await db.insert(schema.users).values(insertUser).returning();
    return user;
  }

  // Tenant
  async getTenant(id: string): Promise<Tenant | undefined> {
    if (!db) return undefined;
    const [tenant] = await db.select().from(schema.tenants).where(eq(schema.tenants.id, id));
    return tenant;
  }

  async createTenant(insertTenant: InsertTenant): Promise<Tenant> {
    if (!db) throw new Error("Database not connected");
    const [tenant] = await db.insert(schema.tenants).values(insertTenant).returning();
    return tenant;
  }

  // API Key
  async getApiKey(keyHash: string): Promise<ApiKey | undefined> {
    if (!db) return undefined;
    const [apiKey] = await db.select().from(schema.apiKeys).where(eq(schema.apiKeys.keyHash, keyHash));
    return apiKey;
  }

  async createApiKey(insertApiKey: InsertApiKey): Promise<ApiKey> {
    if (!db) throw new Error("Database not connected");
    const [apiKey] = await db.insert(schema.apiKeys).values(insertApiKey).returning();
    return apiKey;
  }

  // Issuer
  async getIssuer(id: string): Promise<Issuer | undefined> {
    if (!db) return undefined;
    const [issuer] = await db.select().from(schema.issuers).where(eq(schema.issuers.id, id));
    return issuer;
  }

  async getIssuerByDid(did: string): Promise<Issuer | undefined> {
    if (!db) return undefined;
    const [issuer] = await db.select().from(schema.issuers).where(eq(schema.issuers.did, did));
    return issuer;
  }

  async createIssuer(insertIssuer: InsertIssuer): Promise<Issuer> {
    if (!db) throw new Error("Database not connected");
    const [issuer] = await db.insert(schema.issuers).values(insertIssuer).returning();
    return issuer;
  }

  async listIssuers(tenantId: string): Promise<Issuer[]> {
    if (!db) return [];
    return db.select().from(schema.issuers).where(eq(schema.issuers.tenantId, tenantId));
  }

  // Template
  async getTemplate(id: string): Promise<Template | undefined> {
    if (!db) return undefined;
    const [template] = await db.select().from(schema.templates).where(eq(schema.templates.id, id));
    return template;
  }

  async createTemplate(insertTemplate: InsertTemplate): Promise<Template> {
    if (!db) throw new Error("Database not connected");
    const [template] = await db.insert(schema.templates).values(insertTemplate).returning();
    return template;
  }

  async listTemplates(tenantId: string): Promise<Template[]> {
    if (!db) return [];
    return db.select().from(schema.templates).where(eq(schema.templates.tenantId, tenantId));
  }

  // Credential
  async getCredential(id: string): Promise<Credential | undefined> {
    if (!db) return undefined;
    const [credential] = await db.select().from(schema.credentials).where(eq(schema.credentials.id, id));
    return credential;
  }

  async getCredentialByVcJwt(vcJwt: string): Promise<Credential | undefined> {
    if (!db) return undefined;
    const [credential] = await db.select().from(schema.credentials).where(eq(schema.credentials.vcJwt, vcJwt));
    return credential;
  }

  async createCredential(insertCredential: InsertCredential): Promise<Credential> {
    if (!db) throw new Error("Database not connected");
    const [credential] = await db.insert(schema.credentials).values(insertCredential).returning();
    return credential;
  }

  async listCredentials(tenantId: string): Promise<Credential[]> {
    if (!db) return [];
    return db.select().from(schema.credentials).where(eq(schema.credentials.tenantId, tenantId));
  }

  async revokeCredential(id: string): Promise<void> {
    if (!db) return;
    await db.update(schema.credentials).set({ revoked: true }).where(eq(schema.credentials.id, id));
  }

  async updateCredentialBlockchain(id: string, data: { txHash?: string; blockNumber?: number; credentialHash?: string }): Promise<void> {
    if (!db) return;
    await db.update(schema.credentials).set(data).where(eq(schema.credentials.id, id));
  }

  async createActivityLog(data: { tenantId: string; type: string; title: string; description: string; metadata?: any }): Promise<void> {
    if (!db) return; // Should not throw if logging fails, maybe?
    await db.insert(schema.activityLogs).values(data);
  }

  // Students
  async listStudents(tenantId: string): Promise<Student[]> {
    if (!db) return [];
    return db.select().from(schema.students).where(eq(schema.students.tenantId, tenantId)) as Promise<Student[]>;
  }

  async getStudent(id: string): Promise<Student | undefined> {
    if (!db) return undefined;
    const [student] = await db.select().from(schema.students).where(eq(schema.students.id, id));
    return student as Student | undefined;
  }

  async createStudent(data: Omit<Student, "id" | "createdAt">): Promise<Student> {
    if (!db) throw new Error("Database not connected");
    const [student] = await db.insert(schema.students).values(data).returning();
    return student as Student;
  }

  async updateStudent(id: string, data: Partial<Student>): Promise<Student | undefined> {
    if (!db) return undefined;
    const [student] = await db.update(schema.students).set(data).where(eq(schema.students.id, id)).returning();
    return student as Student | undefined;
  }

  async deleteStudent(id: string): Promise<boolean> {
    if (!db) return false;
    const result = await db.delete(schema.students).where(eq(schema.students.id, id));
    // drizzle doesn't return deleted count in all drivers, but for pg it returns.
    // However result type depends on driver. For simplicity assume it succeeded if no error.
    return true;
  }

  async bulkCreateStudents(students: Omit<Student, "id" | "createdAt">[]): Promise<Student[]> {
    if (!db) throw new Error("Database not connected");
    // Drizzle insert can take an array
    if (students.length === 0) return [];
    const inserted = await db.insert(schema.students).values(students).returning();
    return inserted as Student[];
  }

  // Team Members
  async listTeamMembers(tenantId: string): Promise<TeamMember[]> {
    if (!db) return [];
    return db.select().from(schema.teamMembers).where(eq(schema.teamMembers.tenantId, tenantId)) as Promise<TeamMember[]>;
  }

  async getTeamMember(id: string): Promise<TeamMember | undefined> {
    if (!db) return undefined;
    const [member] = await db.select().from(schema.teamMembers).where(eq(schema.teamMembers.id, id));
    return member as TeamMember | undefined;
  }

  async createTeamMember(data: Omit<TeamMember, "id" | "invitedAt" | "joinedAt">): Promise<TeamMember> {
    if (!db) throw new Error("Database not connected");
    const [member] = await db.insert(schema.teamMembers).values(data).returning();
    return member as TeamMember;
  }

  async updateTeamMember(id: string, data: Partial<TeamMember>): Promise<TeamMember | undefined> {
    if (!db) return undefined;
    const [member] = await db.update(schema.teamMembers).set(data).where(eq(schema.teamMembers.id, id)).returning();
    return member as TeamMember | undefined;
  }

  async deleteTeamMember(id: string): Promise<boolean> {
    if (!db) return false;
    await db.delete(schema.teamMembers).where(eq(schema.teamMembers.id, id));
    return true;
  }

  // Verification Logs
  async listVerificationLogs(tenantId: string): Promise<VerificationLog[]> {
    if (!db) return [];
    return db.select().from(schema.verificationLogs)
      .where(eq(schema.verificationLogs.tenantId, tenantId))
      .orderBy(desc(schema.verificationLogs.timestamp)) as Promise<VerificationLog[]>;
  }

  async createVerificationLog(data: {
    tenantId: string;
    credentialId: string;
    verifierName: string;
    verifierIp: string;
    location: string;
    status: "verified" | "failed" | "suspicious";
    reason?: string;
  }): Promise<VerificationLog> {
    if (!db) throw new Error("Database not connected");
    const [log] = await db.insert(schema.verificationLogs).values({
      tenantId: data.tenantId,
      credentialId: data.credentialId,
      verifierName: data.verifierName,
      ipAddress: data.verifierIp,
      verifierLocation: data.location,
      status: data.status === "verified" ? "success" : data.status,
      reason: data.reason
    }).returning();
    return log as VerificationLog;
  }

  async getVerificationStats(tenantId: string): Promise<{ total: number; today: number; suspicious: number }> {
    if (!db) return { total: 0, today: 0, suspicious: 0 };

    // Efficient aggregation query using SQL
    // But since IStorage expects return value, and doing complex SQL with Drizzle requires `sql` operator.

    const logs = await this.listVerificationLogs(tenantId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
      total: logs.length,
      today: logs.filter(l => l.timestamp >= today).length,
      suspicious: logs.filter(l => l.status === "suspicious").length
    };
    // Optimization note: Could be replaced with count queries for better performance with large datasets.
  }

  // Template Designs
  async listTemplateDesigns(tenantId: string): Promise<TemplateDesign[]> {
    if (!db) return [];
    const designs = await db.select().from(schema.templateDesigns).where(eq(schema.templateDesigns.tenantId, tenantId));
    return designs as unknown as TemplateDesign[]; // Casting due to jsonb fields
  }

  async getTemplateDesign(id: string): Promise<TemplateDesign | undefined> {
    if (!db) return undefined;
    const [design] = await db.select().from(schema.templateDesigns).where(eq(schema.templateDesigns.id, id));
    return design as unknown as TemplateDesign | undefined;
  }

  async createTemplateDesign(data: Omit<TemplateDesign, "id" | "createdAt" | "updatedAt">): Promise<TemplateDesign> {
    if (!db) throw new Error("Database not connected");
    const [design] = await db.insert(schema.templateDesigns).values(data).returning();
    return design as unknown as TemplateDesign;
  }

  async updateTemplateDesign(id: string, data: Partial<TemplateDesign>): Promise<TemplateDesign | undefined> {
    if (!db) return undefined;
    const [design] = await db.update(schema.templateDesigns)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.templateDesigns.id, id))
      .returning();
    return design as unknown as TemplateDesign | undefined;
  }

  async deleteTemplateDesign(id: string): Promise<boolean> {
    if (!db) return false;
    await db.delete(schema.templateDesigns).where(eq(schema.templateDesigns.id, id));
    return true;
  }

  async duplicateTemplateDesign(id: string): Promise<TemplateDesign | undefined> {
    if (!db) return undefined;
    const original = await this.getTemplateDesign(id);
    if (!original) return undefined;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _, createdAt, updatedAt, ...rest } = original;

    const [duplicate] = await db.insert(schema.templateDesigns).values({
      ...rest,
      name: `${original.name} (Copy)`,
      status: "Draft",
    }).returning();

    return duplicate as unknown as TemplateDesign;
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

// Export storage instance
// If databaseUrl is present, use DbStorage (direct DB access)
// Otherwise fallback to MemStorage (in-memory)
export const storage: IStorage = databaseUrl ? new DbStorage() : new MemStorage();
