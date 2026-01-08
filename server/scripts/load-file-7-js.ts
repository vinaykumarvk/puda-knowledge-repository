#!/usr/bin/env tsx
/**
 * Load file 7 (response_cache.sql) into Supabase using JS client
 * This script uses the Supabase JS client to insert data via REST API
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials');
  console.error('   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface ResponseCacheRow {
  id: number;
  question: string;
  question_embedding?: string | null;
  mode: string;
  response: string;
  raw_response?: string | null;
  metadata?: string | null;
  response_id?: string | null;
  is_deep_mode: boolean;
  created_at: string;
  last_accessed_at: string;
  access_count: number;
  is_refreshed: boolean;
  original_cache_id?: number | null;
}

function parseValue(value: string): any {
  const trimmed = value.trim();
  
  if (trimmed === 'NULL') return null;
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  
  // Try to parse as number
  if (/^-?\d+$/.test(trimmed)) return parseInt(trimmed, 10);
  if (/^-?\d+\.\d+$/.test(trimmed)) return parseFloat(trimmed);
  
  // Remove quotes if present
  if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || 
      (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
    return trimmed.slice(1, -1).replace(/''/g, "'").replace(/\\"/g, '"');
  }
  
  return trimmed;
}

function parseRow(rowString: string): ResponseCacheRow | null {
  // Remove outer parentheses
  const cleaned = rowString.trim().replace(/^\(|\)$/g, '');
  
  const values: any[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';
  let i = 0;
  
  while (i < cleaned.length) {
    const char = cleaned[i];
    const nextChar = cleaned[i + 1];
    
    if (!inQuotes && (char === '"' || char === "'")) {
      inQuotes = true;
      quoteChar = char;
      i++;
      continue;
    }
    
    if (inQuotes && char === quoteChar) {
      // Check if it's an escaped quote
      if (nextChar === quoteChar) {
        current += char;
        i += 2;
        continue;
      }
      // End of quoted string
      inQuotes = false;
      quoteChar = '';
      i++;
      continue;
    }
    
    if (!inQuotes && char === ',' && (i === 0 || cleaned[i - 1] !== '\\')) {
      values.push(parseValue(current));
      current = '';
      i++;
      continue;
    }
    
    current += char;
    i++;
  }
  
  // Add last value
  if (current.trim()) {
    values.push(parseValue(current));
  }
  
  // Expected columns: id, question, question_embedding, mode, response, raw_response, metadata, response_id, is_deep_mode, created_at, last_accessed_at, access_count, is_refreshed, original_cache_id
  if (values.length >= 13) {
    return {
      id: values[0],
      question: values[1],
      question_embedding: values[2] || null,
      mode: values[3],
      response: values[4],
      raw_response: values[5] || null,
      metadata: values[6] || null,
      response_id: values[7] || null,
      is_deep_mode: values[8] || false,
      created_at: values[9],
      last_accessed_at: values[10],
      access_count: values[11] || 1,
      is_refreshed: values[12] || false,
      original_cache_id: values[13] || null,
    };
  }
  
  return null;
}

async function ensureTableExists() {
  // Check if table exists by trying to query it
  const { error } = await supabase
    .from('response_cache')
    .select('id')
    .limit(1);
  
  if (error && error.message.includes('does not exist')) {
    console.log('📋 Table does not exist. Creating table...');
    
    // Create table using RPC or direct SQL
    // Since Supabase JS client doesn't support raw SQL, we'll use a workaround
    // The user should run the CREATE TABLE statement from file 7 first
    console.error('❌ Table response_cache does not exist.');
    console.error('   Please run the CREATE TABLE statement from file 7 first:');
    console.error('   - Open pg_dump_split_converted/07_response_cache.sql');
    console.error('   - Copy the CREATE TABLE statement (first ~20 lines)');
    console.error('   - Run it in Supabase SQL Editor');
    console.error('   - Then run this script again\n');
    return false;
  }
  
  return true;
}

async function loadFile7() {
  const filePath = path.join(process.cwd(), 'pg_dump_split_converted', '07_response_cache.sql');
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }
  
  // Check if table exists first
  const tableExists = await ensureTableExists();
  if (!tableExists) {
    process.exit(1);
  }
  
  const fileSize = fs.statSync(filePath).size;
  console.log(`📁 Reading file: ${filePath}`);
  console.log(`📊 File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB\n`);
  
  // Read file line by line to handle large files
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });
  
  let inInsert = false;
  let insertColumns: string[] = [];
  const rows: ResponseCacheRow[] = [];
  let currentRow = '';
  
  console.log('⏳ Parsing INSERT statements...');
  
  for await (const line of rl) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('INSERT INTO public.response_cache')) {
      inInsert = true;
      // Extract column names
      const match = trimmed.match(/INSERT INTO public\.response_cache\s*\(([^)]+)\)/);
      if (match) {
        insertColumns = match[1].split(',').map(c => c.trim());
      }
      continue;
    }
    
    if (inInsert) {
      if (trimmed === ';') {
        // End of INSERT statement
        if (currentRow) {
          const row = parseRow(currentRow);
          if (row) rows.push(row);
          currentRow = '';
        }
        inInsert = false;
        continue;
      }
      
      // Accumulate row data (may span multiple lines)
      if (trimmed.startsWith('(')) {
        currentRow = trimmed;
      } else if (currentRow) {
        currentRow += ' ' + trimmed;
      }
      
      // Check if row is complete (ends with ), or ),
      if (currentRow && (currentRow.endsWith('),') || currentRow.endsWith(');'))) {
        const row = parseRow(currentRow.replace(/[),;]+$/, ''));
        if (row) rows.push(row);
        currentRow = '';
      }
    }
  }
  
  // Handle last row if any
  if (currentRow) {
    const row = parseRow(currentRow);
    if (row) rows.push(row);
  }
  
  console.log(`✅ Parsed ${rows.length} rows\n`);
  
  if (rows.length === 0) {
    console.error('❌ No rows found to insert');
    process.exit(1);
  }
  
  // Insert in batches (Supabase has limits)
  const batchSize = 50; // Smaller batches for large data
  let inserted = 0;
  let errors = 0;
  
  console.log(`📤 Inserting data in batches of ${batchSize}...\n`);
  
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(rows.length / batchSize);
    
    try {
      // Use insert (for initial load) - if duplicates exist, they'll error but that's okay
      const { data, error } = await supabase
        .from('response_cache')
        .insert(batch);
      
      if (error) {
        console.error(`❌ Batch ${batchNum}/${totalBatches} failed:`, error.message);
        if (error.details) console.error('   Details:', error.details);
        errors++;
      } else {
        inserted += batch.length;
        const progress = ((inserted / rows.length) * 100).toFixed(1);
        console.log(`✅ Batch ${batchNum}/${totalBatches}: Inserted ${batch.length} rows (${inserted}/${rows.length} - ${progress}%)`);
      }
    } catch (err: any) {
      console.error(`❌ Batch ${batchNum}/${totalBatches} error:`, err.message);
      errors++;
    }
    
    // Small delay to avoid rate limiting
    if (i + batchSize < rows.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  console.log(`\n✅ Complete!`);
  console.log(`   Inserted: ${inserted} rows`);
  if (errors > 0) {
    console.log(`   Errors: ${errors} batches`);
  }
}

// Run the script
loadFile7().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
