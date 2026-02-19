/**
 * Database connection using Drizzle ORM
 * Set DATABASE_URL in .env to connect to PostgreSQL
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@shared/schema';

const DATABASE_URL = process.env.DATABASE_URL;

let db: ReturnType<typeof drizzle> | null = null;
let pool: Pool | null = null;

export function getDb() {
    if (!DATABASE_URL) {
        console.warn('[DB] DATABASE_URL not set - using in-memory storage');
        return null;
    }

    if (!db) {
        pool = new Pool({ connectionString: DATABASE_URL });
        db = drizzle(pool, { schema });
        console.log('[DB] Connected to PostgreSQL');
    }

    return db;
}

export function isDbConnected(): boolean {
    return !!DATABASE_URL && !!db;
}

export async function closeDb() {
    if (pool) {
        await pool.end();
        pool = null;
        db = null;
    }
}

export { db };
