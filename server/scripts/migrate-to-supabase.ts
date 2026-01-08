#!/usr/bin/env tsx
/**
 * Migration script to load pg_dump.sql into Supabase
 * This script uses Supabase JS client to execute SQL commands
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials');
  console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function executeSQL(sql: string): Promise<void> {
  try {
    // Supabase JS client doesn't support raw SQL execution directly
    // We need to use the REST API's rpc function or execute via direct connection
    // For now, we'll use the Supabase REST API to execute SQL
    
    // Note: Supabase REST API doesn't support arbitrary SQL execution for security
    // We need to use the direct PostgreSQL connection for this migration
    // OR use Supabase's SQL editor API if available
    
    console.log('⚠️  Direct SQL execution via Supabase JS client is not supported');
    console.log('   Using alternative approach: Execute SQL via psql or Supabase dashboard');
    console.log('   Or use Supabase SQL Editor API');
    
    // Alternative: We can parse the SQL and use Supabase client methods
    // But for a full dump, it's better to use psql or Supabase dashboard
    
    throw new Error('Use psql or Supabase dashboard to execute the SQL dump');
  } catch (error: any) {
    console.error('Error executing SQL:', error.message);
    throw error;
  }
}

async function migrate() {
  console.log('🚀 Starting migration to Supabase...\n');
  
  const dumpPath = join(process.cwd(), 'pg_dump.sql');
  console.log(`Reading SQL dump from: ${dumpPath}`);
  
  try {
    const sqlDump = readFileSync(dumpPath, 'utf-8');
    console.log(`✅ Loaded SQL dump (${sqlDump.length} characters)`);
    
    // Split SQL into statements
    // Remove comments and empty lines
    const statements = sqlDump
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('SET ') && !s.startsWith('SELECT pg_catalog'))
      .filter(s => s.length > 10); // Filter out very short statements
    
    console.log(`\n📊 Found ${statements.length} SQL statements to execute`);
    console.log('\n⚠️  IMPORTANT: Supabase JS client cannot execute arbitrary SQL');
    console.log('   You have two options:');
    console.log('\n   1. Use Supabase Dashboard SQL Editor:');
    console.log('      - Go to https://supabase.com/dashboard');
    console.log('      - Navigate to SQL Editor');
    console.log('      - Copy and paste the contents of pg_dump.sql');
    console.log('      - Execute the SQL');
    console.log('\n   2. Use psql command line:');
    console.log('      psql "$DATABASE_URL" < pg_dump.sql');
    console.log('\n   3. Use this script with direct PostgreSQL connection:');
    console.log('      (Requires direct connection to work)');
    
    // For now, we'll create a helper script that can be used with psql
    console.log('\n✅ Migration script ready');
    console.log('   Next step: Execute the SQL dump using one of the methods above');
    
  } catch (error: any) {
    console.error('❌ Error reading SQL dump:', error.message);
    process.exit(1);
  }
}

// Run migration
migrate().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
