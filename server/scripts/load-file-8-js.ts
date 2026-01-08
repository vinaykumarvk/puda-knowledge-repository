#!/usr/bin/env tsx
/**
 * Load file 8 (08_other_tables_and_constraints.sql) into Supabase using JS client
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

function parseRow(rowString: string, columnCount: number): any[] | null {
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
  
  return values.length > 0 ? values : null;
}

interface TableInsert {
  tableName: string;
  columns: string[];
  rows: any[][];
}

async function parseFile(filePath: string): Promise<TableInsert[]> {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });
  
  const tables: Map<string, TableInsert> = new Map();
  let currentTable: TableInsert | null = null;
  let currentRow = '';
  
  for await (const line of rl) {
    const trimmed = line.trim();
    
    // Match INSERT INTO statement
    const insertMatch = trimmed.match(/^INSERT INTO public\.(\w+)\s*\(([^)]+)\)/);
    if (insertMatch) {
      const tableName = insertMatch[1];
      const columns = insertMatch[2].split(',').map(c => c.trim());
      
      currentTable = {
        tableName,
        columns,
        rows: [],
      };
      
      if (!tables.has(tableName)) {
        tables.set(tableName, currentTable);
      } else {
        currentTable = tables.get(tableName)!;
      }
      continue;
    }
    
    // Check for VALUES
    if (trimmed.startsWith('VALUES') && currentTable) {
      continue;
    }
    
    // Check for end of INSERT
    if (trimmed === ';' && currentTable) {
      if (currentRow) {
        const values = parseRow(currentRow, currentTable.columns.length);
        if (values) currentTable.rows.push(values);
        currentRow = '';
      }
      currentTable = null;
      continue;
    }
    
    // Accumulate row data
    if (currentTable) {
      if (trimmed.startsWith('(')) {
        currentRow = trimmed;
      } else if (currentRow) {
        currentRow += ' ' + trimmed;
      }
      
      // Check if row is complete
      if (currentRow && (currentRow.endsWith('),') || currentRow.endsWith(');'))) {
        const rowStr = currentRow.replace(/[),;]+$/, '');
        const values = parseRow(rowStr, currentTable.columns.length);
        if (values) currentTable.rows.push(values);
        currentRow = '';
      }
    }
  }
  
  // Handle last row if any
  if (currentRow && currentTable) {
    const values = parseRow(currentRow, currentTable.columns.length);
    if (values) currentTable.rows.push(values);
  }
  
  return Array.from(tables.values());
}

async function loadFile8() {
  const filePath = path.join(process.cwd(), 'pg_dump_split_converted', '08_other_tables_and_constraints.sql');
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }
  
  const fileSize = fs.statSync(filePath).size;
  console.log(`📁 Reading file: ${filePath}`);
  console.log(`📊 File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB\n`);
  
  console.log('⏳ Parsing INSERT statements...');
  const tables = await parseFile(filePath);
  console.log(`✅ Parsed ${tables.length} tables\n`);
  
  let totalInserted = 0;
  let totalErrors = 0;
  
  // Process each table
  for (const table of tables) {
    console.log(`📋 Processing table: ${table.tableName}`);
    console.log(`   Columns: ${table.columns.length}, Rows: ${table.rows.length}\n`);
    
    if (table.rows.length === 0) {
      console.log(`   ⏭️  Skipping (no data)\n`);
      continue;
    }
    
    // Insert in batches
    const batchSize = 50;
    let inserted = 0;
    let errors = 0;
    
    for (let i = 0; i < table.rows.length; i += batchSize) {
      const batch = table.rows.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(table.rows.length / batchSize);
      
      // Convert rows to objects
      const batchObjects = batch.map(row => {
        const obj: any = {};
        table.columns.forEach((col, idx) => {
          obj[col] = row[idx];
        });
        return obj;
      });
      
      try {
        const { error } = await supabase
          .from(table.tableName)
          .insert(batchObjects);
        
        if (error) {
          console.error(`   ❌ Batch ${batchNum}/${totalBatches} failed:`, error.message);
          errors++;
        } else {
          inserted += batch.length;
          const progress = ((inserted / table.rows.length) * 100).toFixed(1);
          console.log(`   ✅ Batch ${batchNum}/${totalBatches}: ${batch.length} rows (${inserted}/${table.rows.length} - ${progress}%)`);
        }
      } catch (err: any) {
        console.error(`   ❌ Batch ${batchNum}/${totalBatches} error:`, err.message);
        errors++;
      }
      
      // Small delay to avoid rate limiting
      if (i + batchSize < table.rows.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    console.log(`   ✅ ${table.tableName}: ${inserted}/${table.rows.length} rows inserted\n`);
    totalInserted += inserted;
    totalErrors += errors;
  }
  
  console.log(`\n✅ Complete!`);
  console.log(`   Total rows inserted: ${totalInserted}`);
  if (totalErrors > 0) {
    console.log(`   Total errors: ${totalErrors} batches`);
  }
}

// Run the script
loadFile8().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
