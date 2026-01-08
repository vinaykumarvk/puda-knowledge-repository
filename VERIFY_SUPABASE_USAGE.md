# How to Verify App is Using Supabase

## Quick Checks

### 1. Check Startup Logs

When you start the app (`npm run dev`), look for this message in the console:

**✅ Using Supabase:**
```
✅ Using SupabaseStorage (REST API)
```

**❌ Using Drizzle (Direct PostgreSQL):**
```
✅ Using DatabaseStorage (Drizzle ORM)
```

### 2. Check Environment Variables

```bash
# Check if USE_SUPABASE_CLIENT is set
grep USE_SUPABASE_CLIENT .env

# Should show:
# USE_SUPABASE_CLIENT=true
```

### 3. Test Database Connection

Run the test script:
```bash
node test-db-connection.js
```

**If using Supabase:**
- Should connect successfully
- Shows Supabase hostname in the output
- Shows PostgreSQL version

**If connection fails:**
- Check `DATABASE_URL` password encoding
- Verify credentials in Supabase Dashboard

### 4. Check Network Requests (Browser DevTools)

1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Filter by "supabase"
4. Use the app (e.g., load threads, login)
5. You should see requests to:
   - `https://yihuqlzbhaptqjcgcpmh.supabase.co/rest/v1/...`

**If you see Supabase REST API calls:**
- ✅ App is using Supabase JS client

**If you don't see any Supabase requests:**
- ❌ App might be using direct PostgreSQL (Drizzle)

### 5. Check Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Table Editor**
4. Use your app (create a thread, login, etc.)
5. Refresh the Table Editor
6. **If you see new data appearing:**
   - ✅ App is writing to Supabase

### 6. Check Application Logs

Look for these patterns in your server logs:

**Supabase Storage (REST API):**
- No direct PostgreSQL connection errors
- REST API calls (if logged)
- Works even if port 5432 is blocked

**Database Storage (Drizzle):**
- Direct PostgreSQL connection
- May show connection errors if port 5432 is blocked
- Uses connection pooling

## Verification Checklist

- [ ] Startup log shows "Using SupabaseStorage (REST API)"
- [ ] `.env` has `USE_SUPABASE_CLIENT=true`
- [ ] Browser Network tab shows requests to `*.supabase.co/rest/v1/`
- [ ] Data appears in Supabase Dashboard when using the app
- [ ] No connection errors related to port 5432
- [ ] App works locally (even if direct PostgreSQL is blocked)

## Troubleshooting

### Still seeing "Using DatabaseStorage"

1. **Check .env file:**
   ```bash
   cat .env | grep USE_SUPABASE_CLIENT
   ```
   - Should show: `USE_SUPABASE_CLIENT=true`
   - No trailing spaces
   - No quotes around `true`

2. **Restart the app:**
   ```bash
   # Stop the app (Ctrl+C)
   # Then restart
   npm run dev
   ```

3. **Check if .env is being loaded:**
   - Make sure `.env` is in the project root
   - Check if `dotenv` is configured correctly

### Not seeing Supabase requests in Network tab

1. **Clear browser cache**
2. **Check Network tab filters** - make sure "supabase" filter is correct
3. **Try a different action** - login, create thread, etc.
4. **Check if app is actually using storage** - some routes might use `db` directly

## Code-Level Verification

You can also add a debug log in your code:

```typescript
// In server/storage.ts or wherever storage is used
console.log('Storage type:', storage instanceof SupabaseStorage ? 'Supabase' : 'Database');
```

## Expected Behavior

When using Supabase:
- ✅ App works locally (no port 5432 connection needed)
- ✅ Uses HTTPS (port 443) for database operations
- ✅ Same connection method as `report-generator` app
- ✅ Can work behind firewalls/NATs
- ✅ No direct PostgreSQL connection required

When using Drizzle:
- ❌ Requires direct PostgreSQL connection (port 5432)
- ❌ May fail locally if port is blocked
- ❌ Uses connection pooling
