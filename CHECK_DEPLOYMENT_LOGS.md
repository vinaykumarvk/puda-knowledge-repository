# How to Check Cloud Run Deployment Logs

## Quick Steps to Debug Failed Deployment

### 1. View Recent Deployment Logs
In Cloud Run Console:
1. Click on the failed revision (e.g., `ekgproduct-00006-qv8`)
2. Click "LOGS" tab
3. Look for error messages

### 2. Check Build Logs
If the build failed:
1. Go to **Cloud Build** → **History**
2. Click on the failed build
3. Check for build errors

### 3. Common Issues to Check

#### Issue 1: Database Connection
**Error**: `DATABASE_URL must be set` or connection timeout
**Fix**: Verify DATABASE_URL format:
- Should be: `postgresql://user:pass@host:port/db?sslmode=require`
- Check for missing `?` before `sslmode`

#### Issue 2: Server Startup Timeout
**Error**: "Container failed to start and listen on port 8080"
**Fix**: 
- Check if server is listening on `0.0.0.0:8080` (not `localhost`)
- Verify startup logs show "Server started successfully"

#### Issue 3: Missing Dependencies
**Error**: Module not found or import errors
**Fix**: Verify all dependencies in `package.json` are correct

#### Issue 4: Build Failures
**Error**: Build step failed
**Fix**: Check Dockerfile and build process

### 4. Using gcloud CLI

```bash
# View Cloud Run logs
gcloud run services logs read ekg-product \
  --region=europe-west1 \
  --limit=50

# View specific revision logs
gcloud run revisions describe ekgproduct-00006-qv8 \
  --region=europe-west1

# View build logs
gcloud builds list --limit=5
gcloud builds log BUILD_ID
```

### 5. Check Environment Variables

Your current env vars look correct, but verify:
- `DATABASE_URL` format is correct (check for `?sslmode=require`)
- `OPENAI_API_KEY` is valid and not expired
- No extra spaces or special characters

### 6. Test Locally First

Before deploying, test the Docker build locally:

```bash
# Build locally
docker build -t ekg-product-test .

# Run with env vars
docker run -p 8080:8080 \
  -e DATABASE_URL="your_db_url" \
  -e OPENAI_API_KEY="your_key" \
  -e NODE_ENV=production \
  -e PORT=8080 \
  ekg-product-test

# Check if it starts
curl http://localhost:8080/api/health
```

