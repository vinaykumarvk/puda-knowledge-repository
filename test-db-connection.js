#!/usr/bin/env node
/**
 * Test database connection to verify DATABASE_URL is correct
 */
import "dotenv/config";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set in .env');
  process.exit(1);
}

console.log('🔍 Testing database connection...');
console.log('📋 Connection string (password hidden):');
const url = new URL(process.env.DATABASE_URL);
console.log(`   Host: ${url.hostname}`);
console.log(`   Port: ${url.port || '5432'}`);
console.log(`   Database: ${url.pathname.slice(1)}`);
console.log(`   User: ${url.username}`);
console.log('');

const explicitSsl = process.env.DB_SSL;
const sslMode = url.searchParams.get('sslmode');
const useSsl = explicitSsl
  ? ['1', 'true', 'yes'].includes(explicitSsl.toLowerCase())
  : !!sslMode && sslMode !== 'disable';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});

try {
  const res = await pool.query("SELECT NOW() as current_time, version() as pg_version");
  console.log('✅ Connection successful!');
  console.log('');
  console.log('📊 Database Info:');
  console.log(`   Current time: ${res.rows[0].current_time}`);
  console.log(`   PostgreSQL: ${res.rows[0].pg_version.split(' ')[0]} ${res.rows[0].pg_version.split(' ')[1]}`);
  console.log('');
  console.log('✅ Your DATABASE_URL is correctly configured!');
  await pool.end();
} catch (err) {
  console.error('❌ Connection failed!');
  console.error('');
  console.error('Error:', err.message);
  console.error('');
  console.log('💡 Troubleshooting:');
  console.log('   1. Check if password is URL-encoded (special chars like @, #, $ need encoding)');
  console.log('   2. Verify PostgreSQL server is running and reachable');
  console.log('   3. Verify database/user credentials are correct');
  console.log('   4. If using SSL, set sslmode=require in DATABASE_URL or DB_SSL=true');
  process.exit(1);
}
