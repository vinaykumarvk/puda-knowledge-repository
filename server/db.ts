import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as schema from "@shared/schema";

// Don't throw on module load - allow server to start and fail gracefully later
// This allows health checks to work even if DATABASE_URL is not set
if (!process.env.DATABASE_URL) {
  console.warn(
    "⚠️  WARNING: DATABASE_URL is not set. Database operations will fail.",
  );
}

// Configure SSL for Supabase connections
// In development, allow self-signed certificates; in production, use strict verification
const isDevelopment = process.env.NODE_ENV === 'development';
const isSupabase = process.env.DATABASE_URL.includes('supabase.co');

// Initialize Supabase JS client (works via REST API over HTTPS - same as report-generator)
let supabaseClient: SupabaseClient | null = null;
if (isSupabase && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabaseClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
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

  const poolConfig: { connectionString: string; ssl?: boolean | { rejectUnauthorized: boolean } } = {
    connectionString: process.env.DATABASE_URL,
  };

  // Supabase requires SSL, but may use self-signed certificates in some cases
  if (isSupabase) {
    poolConfig.ssl = isDevelopment
      ? { rejectUnauthorized: false } // Allow self-signed certificates in development
      : true; // Use default SSL verification in production
  }

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

// Export Supabase client for operations that can use REST API instead of direct PostgreSQL
// This allows using the same JS-based access method as report-generator
export const supabase = supabaseClient;
