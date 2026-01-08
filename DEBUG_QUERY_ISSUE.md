# Debugging Query Response Issue

## Problem
Question is asked but no response appears. The app should show status updates.

## How to Debug

### 1. Check Browser Console (F12)
1. Open DevTools (F12)
2. Go to **Console** tab
3. Look for:
   - Red error messages
   - Failed API requests
   - Network errors

### 2. Check Network Tab
1. Open DevTools (F12)
2. Go to **Network** tab
3. Ask a question
4. Look for:
   - `POST /api/query` request
   - Check if it's **pending** (never completes)
   - Check the **Status** code (200, 500, etc.)
   - Check the **Response** tab for error messages

### 3. Check Server Logs
Look at the terminal where you ran `npm run dev` for:
- Error messages
- Stack traces
- Database connection errors
- API call failures

### 4. Common Issues

#### Issue: Request hangs/pending
**Possible causes:**
- Database query is slow or stuck
- External API (EKG API) is not responding
- Network timeout

**Check:**
- Server logs for stuck queries
- EKG API status
- Database connection

#### Issue: 500 Internal Server Error
**Possible causes:**
- Database connection failed
- Missing environment variables
- Code error in query processing

**Check:**
- Server logs for error details
- Database connection status
- Environment variables

#### Issue: No status updates shown
**Possible causes:**
- Query status tracker not initialized
- Frontend not polling for status
- Status endpoint not working

**Check:**
- Browser Network tab for `/api/query/:queryId/status` requests
- Server logs for query tracking

### 5. Test the API Directly

```bash
# Test the query endpoint
curl -X POST http://localhost:5000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "question": "how to place order for a mutual fund?",
    "mode": "concise"
  }'
```

This will show you:
- If the endpoint is reachable
- What error (if any) is returned
- Response format

### 6. Check Database Connection

```bash
# Test database connection
node test-db-connection.js
```

If this fails, the query endpoint will also fail.

### 7. Check Environment Variables

Make sure these are set:
- `DATABASE_URL` - Supabase connection string
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key
- `USE_SUPABASE_CLIENT=true` - Enable Supabase JS client
- `AI_INTEGRATIONS_OPENAI_API_KEY` - For embeddings/cache
- `EKG_API_URL` - External API URL (or uses default)

### 8. Check SupabaseStorage Implementation

If using `USE_SUPABASE_CLIENT=true`, verify:
- `SupabaseStorage` methods are implemented
- No missing methods causing errors
- Check server logs for "SupabaseStorage" errors

## Quick Fixes

### If request is pending:
1. Check server logs for errors
2. Check if EKG API is accessible
3. Check database connection

### If 500 error:
1. Check server logs for stack trace
2. Verify all environment variables are set
3. Check if Supabase tables exist

### If no status updates:
1. Check browser Network tab for status polling requests
2. Verify query status tracker is working
3. Check frontend console for errors

## Next Steps

1. **Check browser console** - Look for JavaScript errors
2. **Check Network tab** - See if `/api/query` request completes
3. **Check server logs** - Look for backend errors
4. **Test API directly** - Use curl to test the endpoint

Share the error messages you see and I can help fix them!
