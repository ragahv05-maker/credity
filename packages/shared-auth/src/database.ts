/**
 * Database connection for CredVerse applications
 * Uses Drizzle ORM with PostgreSQL
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

let pool: Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

/**
 * Initialize database connection
 * In production this is mandatory. In non-production, set REQUIRE_DATABASE=true
 * to enforce persistence and prevent accidental in-memory-only execution.
 */
export function initDatabase(): ReturnType<typeof drizzle> | null {
  const databaseUrl = process.env.DATABASE_URL;
  const requireDatabase =
    process.env.NODE_ENV === "production" ||
    process.env.REQUIRE_DATABASE === "true";

  if (!databaseUrl) {
    if (requireDatabase) {
      throw new Error(
        "[Database] CRITICAL: DATABASE_URL is required by current runtime policy",
      );
    }
    console.warn(
      "[Database] DATABASE_URL not set. Persistence-dependent features are disabled.",
    );
    return null;
  }

  if (!pool) {
    pool = new Pool({
      connectionString: databaseUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : undefined, // Enforce SSL in prod
    });

    pool.on("error", (err) => {
      console.error("[Database] Unexpected error on idle client", err);
      process.exit(-1); // Fail fast
    });

    db = drizzle(pool);
    console.log("[Database] Connected to PostgreSQL");
  }

  return db;
}

/**
 * Get the database instance
 */
export function getDatabase(): ReturnType<typeof drizzle> | null {
  return db;
}

/**
 * Check if database is available
 */
export function isDatabaseAvailable(): boolean {
  return db !== null;
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
    console.log("[Database] Connection closed");
  }
}

export { Pool };
