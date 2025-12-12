# Deployment Checklist for Google Cloud

## ✅ Completed Changes

### 1. Deployment Files Created
- ✅ `Dockerfile` - Multi-stage build for production
- ✅ `.dockerignore` - Excludes unnecessary files from build
- ✅ `app.yaml` - App Engine configuration
- ✅ `cloudbuild.yaml` - Cloud Build automation
- ✅ `DEPLOYMENT.md` - Comprehensive deployment guide

### 2. Code Fixes
- ✅ Fixed static file serving path (`server/vite.ts`) - Now correctly looks for `dist/public`
- ✅ Added health check endpoint (`/api/health`)
- ✅ Fixed upload directory for Cloud Run (uses `/tmp` in production)
- ✅ Created `server/utils/uploadPaths.ts` helper for consistent path handling

### 3. Environment Variables
- ✅ Documented all required environment variables in `DEPLOYMENT.md`
- ✅ Added `dotenv` support (already in `server/index.ts`)

## ⚠️ Remaining Issues to Address

### 1. File Upload Paths (CRITICAL)
**Status**: Partially fixed - routes.ts updated, but other services still need updates

**Files that need updating:**
- `server/services/vectorStoreService.ts` (line 194)
- `server/services/documentAnalysisService.ts` (line 643)
- `server/services/backgroundJobService.ts` (lines 163, 171, 183, 606, 610, 620)

**Action Required:**
```typescript
// Replace:
path.join(process.cwd(), 'uploads', ...)

// With:
import { getUploadFilePath, getUploadsBaseDir } from '../utils/uploadPaths';
// Then use the helper functions
```

### 2. Ephemeral Storage Warning
**Status**: Documented but not fully addressed

**Issue**: Cloud Run uses ephemeral storage - uploaded files will be lost on container restart.

**Recommendations:**
1. **Short-term**: Document limitation (already done)
2. **Long-term**: Migrate to Cloud Storage for persistent file storage

### 3. Database Migrations
**Status**: Not automated

**Action Required:**
- Add migration step to deployment process
- Consider adding migration check on startup (optional)

### 4. Build Verification
**Status**: Needs testing

**Action Required:**
```bash
# Test build locally
docker build -t ekg-product-test .
docker run -p 8080:8080 -e DATABASE_URL=... -e OPENAI_API_KEY=... ekg-product-test
```

## 🔍 Pre-Deployment Verification Steps

### 1. Environment Variables
- [ ] `DATABASE_URL` is set and accessible from Cloud Run
- [ ] `OPENAI_API_KEY` or `AI_INTEGRATIONS_OPENAI_API_KEY` is set
- [ ] `NODE_ENV=production` (set automatically in Dockerfile)
- [ ] `PORT=8080` (set automatically in Dockerfile)

### 2. Database Setup
- [ ] Database is provisioned and accessible
- [ ] Schema is migrated: `npm run db:push`
- [ ] Initial data seeded (if needed): `npm run db:init`
- [ ] Database allows connections from Cloud Run IPs

### 3. Build Process
- [ ] `npm run build` completes successfully
- [ ] `dist/public` directory exists after build
- [ ] `dist/index.js` exists after build
- [ ] Docker build completes without errors

### 4. Static Assets
- [ ] `attached_assets` directory is copied to Docker image
- [ ] Static files are accessible in production build

### 5. Health Checks
- [ ] `/api/health` endpoint returns 200 OK
- [ ] Health check configured in Cloud Run/App Engine

## 🚀 Deployment Steps

### Quick Deploy (Cloud Run)
```bash
# 1. Build and push
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/ekg-product

# 2. Deploy
gcloud run deploy ekg-product \
  --image gcr.io/YOUR_PROJECT_ID/ekg-product \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "DATABASE_URL=...,OPENAI_API_KEY=..."
```

### Automated Deploy (Cloud Build)
```bash
# Set up trigger (one-time)
gcloud builds triggers create github \
  --repo-name=YOUR_REPO \
  --repo-owner=YOUR_ORG \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml

# Then push to main branch to trigger build
```

## 📋 Post-Deployment Checklist

- [ ] Application is accessible at Cloud Run URL
- [ ] Health check endpoint responds: `curl https://your-service.run.app/api/health`
- [ ] Database connections work
- [ ] Authentication works (login/logout)
- [ ] File uploads work (with ephemeral storage limitation)
- [ ] Deep mode responses are persisted correctly
- [ ] Static assets load correctly
- [ ] Logs are visible in Cloud Logging

## 🔧 Known Limitations

1. **File Storage**: Uploads are ephemeral in Cloud Run - files lost on restart
2. **Session Storage**: Uses database (good for multi-instance)
3. **Build Time**: First build may take 5-10 minutes
4. **Cold Starts**: Cloud Run may have cold start delays (min-instances=1 mitigates)

## 📝 Notes

- Deep mode persistence is working correctly (stored in database)
- Response IDs are stored in `messages.response_id` field
- Cache is stored in `response_cache` table with embeddings
- All recent changes for deep mode persistence are compatible with cloud deployment

