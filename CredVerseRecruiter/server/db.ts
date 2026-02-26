
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema";

// Ensure DATABASE_URL is set, or provide a dummy one for testing if not strictly required at import time
// Ideally, the application should not crash on import if DB is not needed (e.g. tests using MemStorage)
// However, since we export 'db' immediately initialized, we need a connection string.
// For tests running in environments without a DB, we might want to delay initialization or mock it.
// Given the constraints, we will allow it to be undefined but throw if accessed, or mock it if in test environment?
// Better: simply check if we are in a test environment and allow bypass, or fix the tests to set a dummy URL.
// But 'pg' will try to connect.

if (!process.env.DATABASE_URL) {
  if (process.env.NODE_ENV === 'test') {
     // Mock or no-op for tests that don't need real DB
     // This is a quick fix to allow tests to import storage.ts without crashing
  } else {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }
}

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://user:pass@localhost:5432/db', // Fallback for tests
});

export const db = drizzle(pool, { schema });
