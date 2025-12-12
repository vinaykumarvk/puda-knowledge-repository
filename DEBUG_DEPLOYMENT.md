# Debugging Failed Cloud Run Deployment

## Current Status
✅ Environment variables are correctly set:
- `DATABASE_URL` - Set
- `OPENAI_API_KEY` - Set

❌ Recent deployments failing:
- `ekgproduct-00006-qv8` - Failed
- `ekgproduct-00005-nmw` - Failed
- `ekgproduct-00001-k64` - Working (100% traffic)

## How to Check Logs

### Option 1: Cloud Console (Easiest)
1. Click on the failed revision (e.g., `ekgproduct-00006-qv8`)
2. Click the **"LOGS"** tab
3. Look for error messages - you should see:
   - "Starting server initialization..."
   - Any errors after that

### Option 2: gcloud CLI
```bash
# View logs for the service
gcloud run services logs read ekgproduct \
  --region=europe-west1 \
  --limit=100

# View logs for specific revision
gcloud run revisions logs read ekgproduct-00006-qv8 \
  --region=europe-west1
```

## What to Look For

### Expected Startup Logs (from our fix):
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

### Common Errors:

#### 1. Database Connection Error
```
Error: connect ECONNREFUSED
or
Error: DATABASE_URL must be set
```
**Fix**: Check DATABASE_URL format - should be:
```
postgresql://user:pass@host:port/db?sslmode=require
```
Note: Make sure there's a `?` before `sslmode`

#### 2. Server Not Starting
```
Container failed to start and listen on port 8080
```
**Fix**: This should be fixed with our latest commit. Verify the new code is deployed.

#### 3. Module Not Found
```
Error: Cannot find module '...'
```
**Fix**: Check if all dependencies are in package.json

#### 4. Build Errors
If the build itself failed, check Cloud Build logs:
- Go to **Cloud Build** → **History**
- Click on the failed build
- Check for build errors

## Quick Fixes

### If DATABASE_URL has formatting issue:
I noticed in the screenshot it shows `techsslmode=require` - it should be `tech?sslmode=require`

Update in Cloud Run:
1. Edit & Deploy New Revision
2. Variables & Secrets
3. Edit DATABASE_URL to ensure `?` before `sslmode`

### If server startup is the issue:
The latest fix (server.listen syntax) should resolve this. Make sure:
1. Latest code is pushed to GitHub
2. Cloud Build picks up the new commit
3. New revision is deployed

## Next Steps

1. **Check the logs** for the failed revision
2. **Share the error message** you see
3. **Verify the latest code** is deployed (check if revision 00006 has the server.listen fix)

The environment variables are correct, so the issue is likely:
- Server startup (should be fixed in latest commit)
- Database connection format
- Some runtime error during initialization

