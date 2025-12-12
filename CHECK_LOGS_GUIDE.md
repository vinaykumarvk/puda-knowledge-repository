# How to Check Cloud Run Logs and Fix Issues

## ✅ Confirmed
- DATABASE_URL format is correct: `postgresql://...?sslmode=require`
- OPENAI_API_KEY is set
- Environment variables are configured

## 🔍 Step 1: Check the Logs

### In Cloud Console:
1. Go to **Cloud Run** → **ekgproduct** service
2. Click on the **failed revision** (e.g., `ekgproduct-00006-qv8`)
3. Click the **"LOGS"** tab
4. Look for error messages

### What You Should See (if working):
```
Starting server initialization...
NODE_ENV: production
PORT: 8080
Initializing domain registry...
Domain registry initialized
Setting up routes...
Routes registered
Setting up static file serving...
Static file serving configured
Server started successfully on port 8080
serving on port 8080
```

## 🚨 Common Issues & Fixes

### Issue 1: "Container failed to start and listen on port 8080"
**Status**: Should be fixed in latest commit (`0cc5187`)

**Check:**
- Does revision 00006 have the latest code?
- Look for "Server started successfully" in logs
- If not present, the fix hasn't been deployed yet

**Fix:**
- Ensure latest code is pushed and Cloud Build completed
- Wait for new revision to deploy

### Issue 2: Database Connection Error
**Error messages:**
- `connect ECONNREFUSED`
- `Connection timeout`
- `getaddrinfo ENOTFOUND`

**Possible causes:**
1. **Neon database is paused** (free tier auto-pauses)
2. **Firewall blocking Cloud Run IPs**
3. **Database credentials expired**

**Fix:**
1. Check Neon dashboard - resume database if paused
2. Verify database is active and accessible
3. Test connection from Cloud Shell:
   ```bash
   psql "postgresql://neondb_owner:npg_G7jbd5MxecBQ@ep-little-wind-ae8rfblh.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require"
   ```

### Issue 3: Module Not Found
**Error:** `Cannot find module '...'`

**Fix:**
- Check if all dependencies are in `package.json`
- Verify Docker build completed successfully
- Check Cloud Build logs

### Issue 4: Startup Timeout
**Error:** Container startup timeout

**Possible causes:**
- `initializeDomainRegistry()` taking too long
- Database connection slow
- OpenAI API call during startup

**Current code handles this:**
- Domain registry init is non-blocking (has catch handler)
- Should not prevent server from starting

### Issue 5: Health Check Failing
**Error:** Health check failed

**Check:**
- Is `/api/health` endpoint responding?
- Is server listening on `0.0.0.0:8080`?
- Check if server started successfully

## 🔧 Quick Diagnostic Steps

### 1. Verify Latest Code is Deployed
```bash
# Check recent commits
git log --oneline -3

# Should see:
# 0cc5187 Fix Cloud Run startup: Correct server.listen() syntax
```

### 2. Check Cloud Build Status
- Go to **Cloud Build** → **History**
- Check if latest build succeeded
- If failed, check build logs

### 3. Test Database Connection
From Cloud Shell:
```bash
psql "postgresql://neondb_owner:npg_G7jbd5MxecBQ@ep-little-wind-ae8rfblh.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

### 4. View Logs via CLI
```bash
gcloud run services logs read ekgproduct \
  --region=europe-west1 \
  --limit=100
```

## 📋 Most Likely Issue: Neon Database Paused

If you're using Neon free tier, the database **auto-pauses** after inactivity.

**Check:**
1. Go to Neon dashboard
2. Check if database shows "Paused" or "Active"
3. If paused, click "Resume"

**This is the #1 cause of deployment failures with Neon!**

## 🎯 Action Plan

1. **Check Cloud Run Logs** - This will show the exact error
2. **Check Neon Database Status** - Ensure it's active
3. **Verify Latest Code Deployed** - Check if revision has commit `0cc5187`
4. **Share the Error Message** - From the logs, so we can fix it

## 💡 Quick Test

If you want to test locally first:
```bash
# Build Docker image
docker build -t ekg-test .

# Run with your env vars
docker run -p 8080:8080 \
  -e DATABASE_URL="postgresql://neondb_owner:npg_G7jbd5MxecBQ@ep-little-wind-ae8rfblh.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require" \
  -e OPENAI_API_KEY="your_key" \
  -e NODE_ENV=production \
  -e PORT=8080 \
  ekg-test

# Test health endpoint
curl http://localhost:8080/api/health
```

**Next Step:** Check the Cloud Run logs for the failed revision and share the error message you see. That will tell us exactly what's failing!

