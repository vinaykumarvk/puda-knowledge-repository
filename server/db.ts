import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
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

const poolConfig: { connectionString: string; ssl?: boolean | { rejectUnauthorized: boolean } } = {
  connectionString: process.env.DATABASE_URL,
};

// Supabase requires SSL, but may use self-signed certificates in some cases
if (isSupabase) {
  poolConfig.ssl = isDevelopment
    ? { rejectUnauthorized: false } // Allow self-signed certificates in development
    : true; // Use default SSL verification in production
}

export const pool = new Pool(poolConfig);
export const db = drizzle({ client: pool, schema });

// Export Supabase client for operations that can use REST API instead of direct PostgreSQL
// This allows using the same JS-based access method as report-generator
export const supabase = supabaseClient;
