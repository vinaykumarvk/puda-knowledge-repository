# Switch Back to DatabaseStorage (Match Production)

## Why?

The password issue caused us to switch to `SupabaseStorage` locally, which introduced field mapping bugs. Production uses `DatabaseStorage` successfully. Let's match production.

## Steps

### 1. Get Correct DATABASE_URL from Supabase

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **Settings** → **Database**
4. Scroll to **Connection string** section
5. Select **URI** format
6. Copy the entire connection string
   - It will look like: `postgresql://postgres.xxxxx:[ENCODED-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres`
   - Or: `postgresql://postgres:[ENCODED-PASSWORD]@db.yihuqlzbhaptqjcgcpmh.supabase.co:5432/postgres`
   - **The password is already URL-encoded in this string!**

### 2. Update .env File

```bash
# Replace DATABASE_URL with the one from Supabase Dashboard
DATABASE_URL=postgresql://postgres:[ENCODED-PASSWORD]@db.yihuqlzbhaptqjcgcpmh.supabase.co:5432/postgres

# Remove or comment out this line:
# USE_SUPABASE_CLIENT=true
```

**Important:** Use the connection string exactly as copied from Supabase Dashboard - the password is already properly encoded.

### 3. Restart the Server

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

### 4. Verify

When the server starts, you should see:
```
✅ Using DatabaseStorage (Drizzle ORM)
```

**NOT:**
```
✅ Using SupabaseStorage (REST API)
```

## Benefits

✅ **Same as production** - Uses DatabaseStorage (Drizzle ORM)  
✅ **No field mapping bugs** - Drizzle handles camelCase ↔ snake_case automatically  
✅ **No manual field conversion** - Everything works automatically  
✅ **Fewer bugs** - Same proven code path as production  

## Troubleshooting

### Still seeing "Using SupabaseStorage"
- Check that `USE_SUPABASE_CLIENT` is removed or commented out in `.env`
- Restart the server after changing `.env`

### Connection fails
- Verify the DATABASE_URL is copied exactly from Supabase Dashboard
- Check that the password in the connection string is URL-encoded (no special characters visible)
- Try the connection pooling port (6543) if direct connection (5432) fails

### Password authentication failed
- The password in DATABASE_URL might not be correctly encoded
- Get a fresh connection string from Supabase Dashboard (it's already encoded)
- Or reset the database password in Supabase and get a new connection string

## What This Fixes

- ✅ `createThread` - No more null id errors
- ✅ `createMessage` - No more field mapping issues  
- ✅ All database operations - Drizzle handles everything automatically
- ✅ Frontend errors - Should work once backend is fixed
