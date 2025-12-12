# Troubleshooting Cloud Run Deployment

## ✅ Confirmed Working
- Environment variables are correctly set
- DATABASE_URL format is correct: `postgresql://...?sslmode=require`
- OPENAI_API_KEY is set

## 🔍 What to Check in Logs

Since env vars are correct, check the Cloud Run logs for the failed revision:

### Step 1: View Logs
1. In Cloud Run Console, click on failed revision (e.g., `ekgproduct-00006-qv8`)
2. Click **"LOGS"** tab
3. Look for these specific messages:

### Expected Success Logs:
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

### Common Error Patterns:

#### Error 1: Database Connection Failed
```
Error: connect ECONNREFUSED
Error: Connection timeout
Error: getaddrinfo ENOTFOUND
```
**Possible causes:**
- Database firewall blocking Cloud Run IPs
- Database is paused (Neon free tier)
- Network connectivity issue

**Fix:**
- Check Neon dashboard - ensure database is active
- Verify database allows connections from Cloud Run
- For Neon: Check if database is paused

#### Error 2: Server Not Starting
```
Container failed to start and listen on port 8080
```
**Possible causes:**
- Server crashes before listening
- Error in startup code
- Missing dependencies

**Fix:**
- Check if latest code (commit `0cc5187`) is deployed
- Verify server.listen() fix is in the deployed code

#### Error 3: Module Not Found
```
Error: Cannot find module '...'
Module not found: ...
```
**Possible causes:**
- Missing dependency in package.json
- Build didn't include all files

**Fix:**
- Check package.json has all dependencies
- Verify Dockerfile build completes successfully

#### Error 4: Timeout During Startup
```
Container startup timeout
```
**Possible causes:**
- Domain registry initialization taking too long
- Database connection slow
- OpenAI API call during startup

**Fix:**
- Check if `initializeDomainRegistry()` is blocking
- Verify it has timeout/catch handlers

#### Error 5: Health Check Failing
```
Health check failed
```
**Possible causes:**
- Server not responding on /api/health
- Server crashed after starting
- Port misconfiguration

**Fix:**
- Verify /api/health endpoint exists
- Check server is listening on 0.0.0.0:8080

## 🔧 Quick Diagnostic Commands

### Check if Latest Code is Deployed
```bash
# View recent commits
git log --oneline -5

# Check Cloud Build history
gcloud builds list --limit=5
```

### Test Database Connection
```bash
# From Cloud Shell or locally
psql "postgresql://neondb_owner:npg_G7jbd5MxecBQ@ep-little-wind-ae8rfblh.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

### Check Cloud Run Logs
```bash
gcloud run services logs read ekgproduct \
  --region=europe-west1 \
  --limit=100 \
  --format=json
```

## 🎯 Most Likely Issues

Based on your setup:

1. **Neon Database Paused** (if using free tier)
   - Check Neon dashboard
   - Resume database if paused

2. **Latest Code Not Deployed**
   - Verify revision 00006 has commit `0cc5187`
   - Check Cloud Build completed successfully

3. **Startup Timeout**
   - Domain registry initialization might be slow
   - Check if it's timing out

4. **Database Connection from Cloud Run**
   - Verify Neon allows connections from Cloud Run IPs
   - Check firewall/network settings

## 📋 Action Items

1. **Check Cloud Run Logs** - This will tell us exactly what's failing
2. **Verify Latest Code Deployed** - Ensure revision 00006 has the server.listen fix
3. **Check Neon Database Status** - Ensure it's active and accessible
4. **Review Build Logs** - Check if Docker build succeeded

Share the error message from the logs and we can fix it!

