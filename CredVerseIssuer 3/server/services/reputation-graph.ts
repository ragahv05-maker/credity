import { randomUUID } from "crypto";

export type ReputationEdgeType = "ISSUED" | "VERIFIED" | "ENDORSED" | "REVOKED";

export interface ReputationGraphConfig {
  enabled: boolean;
  uri: string;
  username: string;
  password: string;
  database: string;
}

export interface ReputationGraphParseOptions {
  logger?: Pick<Console, "warn" | "error">;
  throwOnError?: boolean;
}

export interface ReputationEdgeWriteInput {
  issuerDid: string;
  subjectDid: string;
  edgeType: ReputationEdgeType;
  scoreDelta?: number;
  context?: Record<string, string | number | boolean>;
  occurredAt?: string;
}

export interface ReputationSnapshotQuery {
  subjectDid: string;
  asOf?: string;
}

export interface ReputationSnapshot {
  subjectDid: string;
  totalScore: number;
  edgeCount: number;
  updatedAt: string;
}

export interface ReputationGraphWriter {
  writeEdge(
    input: ReputationEdgeWriteInput,
  ): Promise<{ accepted: boolean; reason?: string }>;
}

export interface ReputationGraphReader {
  getSnapshot(
    query: ReputationSnapshotQuery,
  ): Promise<ReputationSnapshot | null>;
}

export interface ReputationGraphService
  extends ReputationGraphWriter, ReputationGraphReader {}

export interface ReputationGraphSession {
  run(
    query: string,
    params?: Record<string, unknown>,
  ): Promise<{ records?: unknown[] }>;
  close(): Promise<void>;
}

export interface ReputationGraphDriver {
  session(options?: { database?: string }): ReputationGraphSession;
  verifyConnectivity?: () => Promise<void>;
  close?: () => Promise<void>;
}

type ReputationGraphDriverFactory = (
  config: ReputationGraphConfig,
  logger: Pick<Console, "warn" | "error" | "info">,
) => Promise<ReputationGraphDriver | null>;

export interface ReputationGraphServiceCreateOptions {
  logger?: Pick<Console, "warn" | "error" | "info">;
  driver?: ReputationGraphDriver;
  driverFactory?: ReputationGraphDriverFactory;
}

const DEFAULT_URI = "bolt://localhost:7687";
const DEFAULT_DATABASE = "neo4j";
const VALID_URI_PREFIXES = ["bolt://", "neo4j://"];

function isTruthyEnabled(value?: string): boolean {
  return value === "true";
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (value && typeof value === "object") {
    const maybeNumber = value as { toNumber?: () => number; low?: number };
    if (typeof maybeNumber.toNumber === "function") {
      const parsed = maybeNumber.toNumber();
      if (Number.isFinite(parsed)) return parsed;
    }
    if (
      typeof maybeNumber.low === "number" &&
      Number.isFinite(maybeNumber.low)
    ) {
      return maybeNumber.low;
    }
  }
  return fallback;
}

function readRecordValue(record: unknown, key: string): unknown {
  if (record && typeof record === "object") {
    const withGetter = record as { get?: (k: string) => unknown };
    if (typeof withGetter.get === "function") {
      return withGetter.get(key);
    }

    const asObject = record as Record<string, unknown>;
    if (key in asObject) return asObject[key];
  }
  return undefined;
}

function toIsoOrNow(value?: string): string {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

async function defaultNeo4jDriverFactory(
  config: ReputationGraphConfig,
  logger: Pick<Console, "warn" | "error" | "info">,
): Promise<ReputationGraphDriver | null> {
  try {
    const neo4jModule = await import("neo4j-driver");
    const neo4j = (neo4jModule as any).default ?? neo4jModule;

    if (!neo4j?.driver || !neo4j?.auth?.basic) {
      logger.error(
        "[reputation-graph] neo4j-driver module loaded but expected exports are missing.",
      );
      return null;
    }

    const driver = neo4j.driver(
      config.uri,
      neo4j.auth.basic(config.username, config.password),
      { disableLosslessIntegers: true },
    ) as ReputationGraphDriver;

    if (typeof driver.verifyConnectivity === "function") {
      await driver.verifyConnectivity();
    }

    return driver;
  } catch (error: any) {
    logger.error(
      `[reputation-graph] Failed to initialize Neo4j driver: ${error?.message || String(error)}`,
    );
    return null;
  }
}

export function parseReputationGraphConfig(
  env: NodeJS.ProcessEnv = process.env,
  options: ReputationGraphParseOptions = {},
): ReputationGraphConfig {
  const logger = options.logger ?? console;
  const throwOnError = options.throwOnError ?? true;
  const enabled = isTruthyEnabled(env.REPUTATION_GRAPH_ENABLED);

  const config: ReputationGraphConfig = {
    enabled,
    uri: env.REPUTATION_GRAPH_URI ?? DEFAULT_URI,
    username: env.REPUTATION_GRAPH_USERNAME ?? "neo4j",
    password: env.REPUTATION_GRAPH_PASSWORD ?? "",
    database: env.REPUTATION_GRAPH_DATABASE ?? DEFAULT_DATABASE,
  };

  const warnings: string[] = [];
  const errors: string[] = [];

  if (!enabled) {
    if (
      env.REPUTATION_GRAPH_URI ||
      env.REPUTATION_GRAPH_USERNAME ||
      env.REPUTATION_GRAPH_PASSWORD ||
      env.REPUTATION_GRAPH_DATABASE
    ) {
      warnings.push(
        '[reputation-graph] REPUTATION_GRAPH_ENABLED is not "true"; graph settings are ignored and service remains in no-op mode.',
      );
    }
  } else {
    if (!config.password.trim()) {
      errors.push(
        "[reputation-graph] REPUTATION_GRAPH_PASSWORD is required when REPUTATION_GRAPH_ENABLED=true.",
      );
    }

    if (!VALID_URI_PREFIXES.some((prefix) => config.uri.startsWith(prefix))) {
      errors.push(
        `[reputation-graph] REPUTATION_GRAPH_URI must start with one of: ${VALID_URI_PREFIXES.join(", ")}. Received: ${config.uri}`,
      );
    }

    if (!env.REPUTATION_GRAPH_URI) {
      warnings.push(
        `[reputation-graph] REPUTATION_GRAPH_URI not set; using local scaffold default ${DEFAULT_URI} (not production-safe).`,
      );
    }

    if (!env.REPUTATION_GRAPH_DATABASE) {
      warnings.push(
        `[reputation-graph] REPUTATION_GRAPH_DATABASE not set; using default ${DEFAULT_DATABASE} (intended for local/dev).`,
      );
    }

    if (!env.REPUTATION_GRAPH_USERNAME) {
      warnings.push(
        "[reputation-graph] REPUTATION_GRAPH_USERNAME not set; defaulting to neo4j account.",
      );
    }
  }

  for (const warning of warnings) {
    logger.warn(warning);
  }

  if (errors.length > 0) {
    const message = errors.join(" ");
    logger.error(message);
    if (throwOnError) {
      throw new Error(message);
    }
  }

  return config;
}

class NoopReputationGraphService implements ReputationGraphService {
  constructor(private readonly config: ReputationGraphConfig) {}

  async writeEdge(): Promise<{ accepted: boolean; reason: string }> {
    if (!this.config.enabled) {
      return { accepted: false, reason: "reputation_graph_disabled" };
    }

    return { accepted: false, reason: "reputation_graph_not_implemented" };
  }

  async getSnapshot(
    query: ReputationSnapshotQuery,
  ): Promise<ReputationSnapshot | null> {
    if (!this.config.enabled) {
      return null;
    }

    return {
      subjectDid: query.subjectDid,
      totalScore: 0,
      edgeCount: 0,
      updatedAt: new Date(0).toISOString(),
    };
  }
}

class Neo4jReputationGraphService implements ReputationGraphService {
  private resolvedDriver: ReputationGraphDriver | null = null;
  private driverPromise: Promise<ReputationGraphDriver | null> | null = null;

  constructor(
    private readonly config: ReputationGraphConfig,
    private readonly logger: Pick<Console, "warn" | "error" | "info">,
    private readonly driverFactory: ReputationGraphDriverFactory,
    private readonly driverOverride?: ReputationGraphDriver,
  ) {}

  private async getDriver(): Promise<ReputationGraphDriver | null> {
    if (!this.config.enabled) return null;
    if (this.driverOverride) return this.driverOverride;
    if (this.resolvedDriver) return this.resolvedDriver;

    if (!this.driverPromise) {
      this.driverPromise = this.driverFactory(this.config, this.logger);
    }

    this.resolvedDriver = await this.driverPromise;
    return this.resolvedDriver;
  }

  async writeEdge(
    input: ReputationEdgeWriteInput,
  ): Promise<{ accepted: boolean; reason?: string }> {
    if (!this.config.enabled) {
      return { accepted: false, reason: "reputation_graph_disabled" };
    }

    const driver = await this.getDriver();
    if (!driver) {
      return { accepted: false, reason: "reputation_graph_driver_unavailable" };
    }

    const scoreDelta = Number.isFinite(input.scoreDelta)
      ? Number(input.scoreDelta)
      : 0;
    const occurredAt = toIsoOrNow(input.occurredAt);
    const createdAt = new Date().toISOString();

    const session = driver.session({ database: this.config.database });
    try {
      const query = `
MERGE (issuer:ReputationEntity {did: $issuerDid})
MERGE (subject:ReputationEntity {did: $subjectDid})
CREATE (issuer)-[edge:REPUTATION_EDGE {
  id: $edgeId,
  edgeType: $edgeType,
  scoreDelta: $scoreDelta,
  occurredAt: datetime($occurredAt),
  createdAt: datetime($createdAt),
  context: $context
}]->(subject)
RETURN edge.id AS edgeId
`;

      const result = await session.run(query, {
        edgeId: randomUUID(),
        issuerDid: input.issuerDid,
        subjectDid: input.subjectDid,
        edgeType: input.edgeType,
        scoreDelta,
        occurredAt,
        createdAt,
        context: input.context || {},
      });

      const firstRecord = result.records?.[0];
      const edgeId = readRecordValue(firstRecord, "edgeId");
      return edgeId
        ? { accepted: true }
        : { accepted: true, reason: "reputation_graph_edge_written" };
    } catch (error: any) {
      this.logger.error(
        `[reputation-graph] writeEdge failed: ${error?.message || String(error)}`,
      );
      return { accepted: false, reason: "reputation_graph_write_failed" };
    } finally {
      await session.close();
    }
  }

  async getSnapshot(
    query: ReputationSnapshotQuery,
  ): Promise<ReputationSnapshot | null> {
    if (!this.config.enabled) {
      return null;
    }

    const driver = await this.getDriver();
    if (!driver) {
      return null;
    }

    const defaultUpdatedAt = new Date(0).toISOString();
    const session = driver.session({ database: this.config.database });

    try {
      const cypher = `
OPTIONAL MATCH (subject:ReputationEntity {did: $subjectDid})
WITH subject
OPTIONAL MATCH ()-[edge:REPUTATION_EDGE]->(subject)
WHERE subject IS NOT NULL
  AND ($asOf IS NULL OR edge.occurredAt <= datetime($asOf))
RETURN
  subject IS NOT NULL AS exists,
  coalesce(sum(edge.scoreDelta), 0) AS totalScore,
  count(edge) AS edgeCount,
  coalesce(toString(max(edge.occurredAt)), $defaultUpdatedAt) AS updatedAt
`;

      const result = await session.run(cypher, {
        subjectDid: query.subjectDid,
        asOf: query.asOf || null,
        defaultUpdatedAt,
      });

      const firstRecord = result.records?.[0];
      if (!firstRecord) return null;

      const exists = Boolean(readRecordValue(firstRecord, "exists"));
      if (!exists) return null;

      const totalScore = toFiniteNumber(
        readRecordValue(firstRecord, "totalScore"),
        0,
      );
      const edgeCount = toFiniteNumber(
        readRecordValue(firstRecord, "edgeCount"),
        0,
      );
      const updatedAtRaw = readRecordValue(firstRecord, "updatedAt");
      const updatedAt =
        typeof updatedAtRaw === "string" ? updatedAtRaw : defaultUpdatedAt;

      return {
        subjectDid: query.subjectDid,
        totalScore,
        edgeCount,
        updatedAt,
      };
    } catch (error: any) {
      this.logger.error(
        `[reputation-graph] getSnapshot failed: ${error?.message || String(error)}`,
      );
      return null;
    } finally {
      await session.close();
    }
  }
}

export function createReputationGraphService(
  config: ReputationGraphConfig = parseReputationGraphConfig(),
  options: ReputationGraphServiceCreateOptions = {},
): ReputationGraphService {
  if (!config.enabled) {
    return new NoopReputationGraphService(config);
  }

  const logger = options.logger ?? console;
  const driverFactory = options.driverFactory ?? defaultNeo4jDriverFactory;

  return new Neo4jReputationGraphService(
    config,
    logger,
    driverFactory,
    options.driver,
  );
}
