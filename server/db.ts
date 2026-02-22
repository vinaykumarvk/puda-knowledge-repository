import "dotenv/config";
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Don't throw on module load - allow server to start and fail gracefully later
// This allows health checks to work even if DATABASE_URL is not set
if (!process.env.DATABASE_URL) {
  console.warn(
    "⚠️  WARNING: DATABASE_URL is not set. Database operations will fail.",
  );
}

// Lazy initialization - only create pool when DATABASE_URL is available
let poolInstance: Pool | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

function initializePool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }

  const poolConfig: { connectionString: string } = {
    connectionString: process.env.DATABASE_URL,
  };

  return new Pool(poolConfig);
}

function getPool(): Pool {
  if (!poolInstance) {
    poolInstance = initializePool();
  }
  return poolInstance;
}

function getDb() {
  if (!dbInstance) {
    dbInstance = drizzle({ client: getPool(), schema });
  }
  return dbInstance;
}

// Export proxies that lazily initialize on first use
export const pool = new Proxy({} as Pool, {
  get(_target, prop) {
    const pool = getPool();
    const value = pool[prop as keyof Pool];
    return typeof value === 'function' ? value.bind(pool) : value;
  }
});

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    const db = getDb();
    const value = db[prop as keyof ReturnType<typeof drizzle>];
    return typeof value === 'function' ? value.bind(db) : value;
  }
});
