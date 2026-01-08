# Supabase Migration Guide

This guide explains how to migrate from Drizzle ORM (direct PostgreSQL) to Supabase JS client.

## Overview

The EKGproduct application now supports both:
- **DatabaseStorage** (Drizzle ORM) - Requires direct PostgreSQL connection (port 5432)
- **SupabaseStorage** (Supabase JS client) - Works via REST API over HTTPS (port 443)

## Step 1: Load SQL Dump into Supabase

### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy the contents of `pg_dump.sql`
6. Paste into the SQL Editor
7. Click **Run** to execute

### Option B: Using psql (if direct connection works)

```bash
# Make sure DATABASE_URL is set in your .env
psql "$DATABASE_URL" < pg_dump.sql
```

### Option C: Using the provided script

```bash
# This script will attempt to use psql
./server/scripts/load-dump-to-supabase.sh
```

**Note:** If direct connection doesn't work locally, use Option A (Supabase Dashboard).

## Step 2: Switch to Supabase Storage

Update your code to use `SupabaseStorage` instead of `DatabaseStorage`:

### In `server/storage.ts` or wherever storage is exported:

```typescript
// Option 1: Always use Supabase
import { SupabaseStorage } from './supabase-storage';
export const storage = new SupabaseStorage();

// Option 2: Environment-based switching
import { DatabaseStorage } from './storage';
import { SupabaseStorage } from './supabase-storage';

export const storage = process.env.USE_SUPABASE_CLIENT === 'true'
  ? new SupabaseStorage()
  : new DatabaseStorage();
```

### In `.env`:

```bash
# Set this to use Supabase JS client (works locally)
USE_SUPABASE_CLIENT=true
```

## Step 3: Update Code That Uses Storage

The `SupabaseStorage` class implements the same `IStorage` interface, so most code should work without changes. However, you may need to:

1. **Update imports** - Change from `DatabaseStorage` to `SupabaseStorage` if you're importing the class directly
2. **Handle column name differences** - Supabase returns snake_case by default, but the `mapRow` function handles basic conversion
3. **Test all operations** - Some complex queries may need adjustment

## Step 4: Test the Migration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Test key operations:
   - User authentication
   - Creating threads and messages
   - Investment requests
   - Document operations

3. Check the console for any Supabase errors

## Known Limitations

### SupabaseStorage Implementation Status

✅ **Fully Implemented:**
- User operations
- Session operations
- Thread operations
- Message operations
- Basic CRUD for most tables

⚠️ **Partially Implemented:**
- Complex queries with joins
- Vector similarity searches (requires direct PostgreSQL)
- Some advanced filtering

❌ **Not Yet Implemented:**
- `saveQuizAttemptAndUpdateMastery` - Complex transaction
- Some template operations
- Sequence operations

### When to Use Each Storage

**Use SupabaseStorage when:**
- ✅ Local development (direct PostgreSQL connection blocked)
- ✅ Simple CRUD operations
- ✅ REST API access is sufficient

**Use DatabaseStorage when:**
- ✅ Production (direct connection available)
- ✅ Complex queries with joins
- ✅ Vector similarity searches
- ✅ Raw SQL execution needed

## Troubleshooting

### Error: "Supabase client not initialized"

Make sure these environment variables are set:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Error: "Table not found"

1. Verify the SQL dump was loaded successfully
2. Check table names match (Supabase uses snake_case by default)
3. Ensure RLS (Row Level Security) policies allow access

### Error: "Permission denied"

The service role key bypasses RLS. If you're using anon key, you may need to:
1. Check RLS policies in Supabase Dashboard
2. Update policies to allow necessary operations

## Next Steps

1. Complete the remaining `SupabaseStorage` methods
2. Add proper snake_case to camelCase conversion
3. Implement complex query support
4. Add migration tests
5. Update all service files to use Supabase client

## Files Modified

- `server/db.ts` - Added Supabase client export
- `server/supabase-storage.ts` - New SupabaseStorage implementation
- `server/scripts/migrate-to-supabase.ts` - Migration helper script
- `server/scripts/load-dump-to-supabase.sh` - SQL dump loader script
