# Switch Application to Use Supabase

Now that all tables and data have been migrated to Supabase, follow these steps to ensure your app reads from Supabase instead of Neon.

## Step 1: Update Environment Variables

Update your `.env` file with the following:

```bash
# Point DATABASE_URL to Supabase (not Neon)
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.yihuqlzbhaptqjcgcpmh.supabase.co:5432/postgres

# Supabase credentials (required for SupabaseStorage)
SUPABASE_URL=https://yihuqlzbhaptqjcgcpmh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Enable Supabase JS client (this switches storage to use Supabase)
USE_SUPABASE_CLIENT=true
```

### Where to get these values:

1. **DATABASE_URL**: 
   - Go to https://supabase.com/dashboard
   - Select your project → Settings → Database
   - Copy the "Connection string" (URI format)
   - Replace `[YOUR-PASSWORD]` with your actual database password

2. **SUPABASE_URL**:
   - Same page as above
   - It's the "Project URL" (e.g., `https://yihuqlzbhaptqjcgcpmh.supabase.co`)

3. **SUPABASE_SERVICE_ROLE_KEY**:
   - Same page as above
   - Scroll to "Project API keys"
   - Copy the "service_role" key (⚠️ Keep this secret!)

## Step 2: Verify the Switch

When you start your application, you should see this log message:

```
✅ Using SupabaseStorage (REST API)
```

If you see:
```
✅ Using DatabaseStorage (Drizzle ORM)
```

Then `USE_SUPABASE_CLIENT` is not set to `'true'` in your `.env` file.

## Step 3: Test the Connection

1. **Start your application:**
   ```bash
   npm run dev
   ```

2. **Check the logs** - You should see:
   ```
   ✅ Using SupabaseStorage (REST API)
   ```

3. **Test a database operation** - Try logging in or creating a user to verify data is being read from Supabase.

## How It Works

The application uses a **hybrid approach**:

- **When `USE_SUPABASE_CLIENT=true`**: 
  - Uses `SupabaseStorage` class
  - All database operations go through Supabase JS client
  - Works via REST API over HTTPS (port 443)
  - Same method as your `report-generator` app

- **When `USE_SUPABASE_CLIENT` is not set or `false`**:
  - Uses `DatabaseStorage` class  
  - All database operations use Drizzle ORM
  - Requires direct PostgreSQL connection (port 5432)
  - This is what you were using with Neon

## Current Implementation Status

The `SupabaseStorage` class implements most of the `IStorage` interface. If you encounter any missing methods, they will need to be added to `server/supabase-storage.ts`.

## Troubleshooting

### "Supabase client not initialized"
- Check that `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in `.env`
- Restart your application after updating `.env`

### "Table does not exist"
- Verify all tables were created in Supabase
- Check table names match exactly (case-sensitive)

### Still seeing "Using DatabaseStorage"
- Make sure `.env` has `USE_SUPABASE_CLIENT=true` (not `USE_SUPABASE_CLIENT=true ` with trailing space)
- Restart your application
- Check that the `.env` file is being loaded (some frameworks require explicit loading)

### Data not appearing
- Verify data was successfully loaded into Supabase
- Check Supabase Dashboard → Table Editor to see if data exists
- Verify `DATABASE_URL` points to Supabase (not Neon)

## Verification Checklist

- [ ] `DATABASE_URL` points to Supabase (contains `supabase.co`)
- [ ] `SUPABASE_URL` is set correctly
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- [ ] `USE_SUPABASE_CLIENT=true` is in `.env`
- [ ] Application logs show "Using SupabaseStorage (REST API)"
- [ ] Can successfully query data (e.g., login works)
- [ ] Data matches what's in Supabase Dashboard

## Rollback (if needed)

If you need to switch back to Neon or direct PostgreSQL:

1. Remove or set `USE_SUPABASE_CLIENT=false` in `.env`
2. Update `DATABASE_URL` to point back to Neon
3. Restart the application

The app will automatically use `DatabaseStorage` (Drizzle ORM) again.
