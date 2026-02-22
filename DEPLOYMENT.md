# Google Cloud Deployment Guide

## Prerequisites

1. **Google Cloud Project** with billing enabled
2. **Cloud Run API** enabled
3. **Container Registry API** enabled (or Artifact Registry)
4. **PostgreSQL Database** (Neon, Cloud SQL, or compatible)
5. **OpenAI API Key** (or AI Integrations configured)

## Required Environment Variables

Set these in Cloud Run service variables (or Secret Manager-backed variables).

### Database
- `DATABASE_URL` - PostgreSQL connection string (required)
  - Local/proxy format: `postgresql://user:password@127.0.0.1:5432/ekg_product?sslmode=disable`
  - Cloud Run + Cloud SQL socket format:
    - `postgresql://user:password@/ekg_product?host=/cloudsql/wealth-report:europe-west1:puda-pg`
  - Do **not** set this to the Cloud SQL connection name alone.
    - Invalid example: `wealth-report:europe-west1:puda-pg`

### OpenAI/AI Integration
- `OPENAI_API_KEY` - OpenAI API key (required for AI features)
  - OR `AI_INTEGRATIONS_OPENAI_API_KEY` - Replit AI Integrations key
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - (Optional) Custom OpenAI base URL
- `OPENAI_FORMATTER_MODEL` - (Optional) Model for formatting responses (default: "gpt-5.1")
- `PUDA_ACTS_REGULATIONS_KG_PATH` - **Required** KG path (recommended: `gs://bucket/path/to/puda_master_kg.json`)
- `DOC_VECTOR_STORE_ID` - **Required** document vector store id
- `KG_VECTOR_STORE_ID` - **Required** KG vector store id

### Application
- `NODE_ENV` - Set to `production` (automatically set in Dockerfile)
- `PORT` - Port to listen on (default: 8080, automatically set in Dockerfile)
- `EKG_DEEP_MODEL` - Recommended: `gpt-5.1`
- `EKG_DEEP_BACKGROUND_MODE` - Recommended: `false`

### Cloud Run Variables Checklist (PUDA)

Set these exact keys in Cloud Run:
- `DATABASE_URL`
- `OPENAI_API_KEY` (prefer Secret Manager)
- `DOC_VECTOR_STORE_ID`
- `KG_VECTOR_STORE_ID`
- `PUDA_ACTS_REGULATIONS_KG_PATH`
- `EKG_DEEP_MODEL`
- `EKG_DEEP_BACKGROUND_MODE`

### Optional
- `PYTHON_API_URL` - Python API service URL (if using external vector store service)
- `SESSION_SECRET` - (Not currently used, sessions stored in DB)

## Deployment Options

### Option 1: Cloud Run (Recommended)

#### Using Cloud Build (Automated)

1. **Set up Cloud Build trigger:**
   ```bash
   gcloud builds triggers create github \
     --repo-name=YOUR_REPO \
     --repo-owner=YOUR_ORG \
     --branch-pattern="^main$" \
     --build-config=cloudbuild.yaml
   ```

2. **Set environment variables in Cloud Run:**
   ```bash
   gcloud run services update puda-knowledge-agent \
     --region=europe-west1 \
     --update-env-vars="DATABASE_URL=postgresql://user:password@/ekg_product?host=/cloudsql/wealth-report:europe-west1:puda-pg,DOC_VECTOR_STORE_ID=vs_xxx,KG_VECTOR_STORE_ID=vs_xxx,PUDA_ACTS_REGULATIONS_KG_PATH=gs://wealth-report/kg/master_kg.json,EKG_DEEP_MODEL=gpt-5.1,EKG_DEEP_BACKGROUND_MODE=false"
   ```

#### Manual Deployment

1. **Build and push image:**
   ```bash
   gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/puda-knowledge-agent
   ```

2. **Deploy to Cloud Run:**
   ```bash
   gcloud run deploy puda-knowledge-agent \
     --image gcr.io/YOUR_PROJECT_ID/puda-knowledge-agent \
     --region europe-west1 \
     --platform managed \
     --allow-unauthenticated \
     --port 8080 \
     --memory 4Gi \
     --cpu 2 \
     --min-instances 1 \
     --max-instances 10 \
     --add-cloudsql-instances wealth-report:europe-west1:puda-pg \
     --update-env-vars "DATABASE_URL=postgresql://user:password@/ekg_product?host=/cloudsql/wealth-report:europe-west1:puda-pg,DOC_VECTOR_STORE_ID=vs_xxx,KG_VECTOR_STORE_ID=vs_xxx,PUDA_ACTS_REGULATIONS_KG_PATH=gs://wealth-report/kg/master_kg.json,EKG_DEEP_MODEL=gpt-5.1,EKG_DEEP_BACKGROUND_MODE=false"
   ```

### KG File Placement

- Store the large PUDA KG JSON in Cloud Storage (GCS).
- Do not commit KG JSON files to GitHub.
- The container no longer bundles local `master_kg*.json` files; runtime uses `PUDA_ACTS_REGULATIONS_KG_PATH`.

### Option 2: App Engine

1. **Set environment variables in app.yaml** (or use Secret Manager)

2. **Deploy:**
   ```bash
   gcloud app deploy
   ```

## Database Setup

### Initial Schema Migration

Before first deployment, run database migrations:

```bash
# Set DATABASE_URL environment variable
export DATABASE_URL="your_connection_string"

# Prepare extensions, push schema, and seed default users
npm run db:init
```

### Using Cloud SQL

If using Cloud SQL, ensure:
1. Cloud SQL Admin API is enabled
2. Cloud Run service account has Cloud SQL Client role
3. Connection string format: `postgresql://user:pass@/dbname?host=/cloudsql/PROJECT:REGION:INSTANCE`
4. Cloud Run service is attached to the instance via `--add-cloudsql-instances`

## File Storage Considerations

⚠️ **Important**: The application currently uses local file storage for uploads (`uploads/documents`). In Cloud Run, this is **ephemeral** and files will be lost on container restart.

### Recommended Solutions:

1. **Use Cloud Storage** (Recommended for production):
   - Modify `server/routes.ts` to upload to Cloud Storage
   - Update file retrieval to use Cloud Storage URLs

2. **Use Cloud SQL for small files**:
   - Store file contents in database BLOB fields

3. **Accept ephemeral storage** (Development only):
   - Files will be lost on container restart
   - Suitable for development/testing only

## Build Process

The build process:
1. Installs dependencies (`npm ci`)
2. Builds frontend (`vite build` → `dist/public`)
3. Bundles server (`esbuild` → `dist/index.js`)
4. Creates production image

## Health Checks

The application includes a health check endpoint:
- **Path**: `/api/health`
- **Response**: `{ "status": "ok", "timestamp": "..." }`

Configured in:
- `app.yaml` (App Engine)
- `cloudbuild.yaml` (Cloud Run - via Cloud Run defaults)

## Monitoring & Logging

- **Logs**: Available in Cloud Logging
- **Metrics**: Cloud Run provides CPU, memory, request metrics
- **Errors**: Check Cloud Logging for application errors

## Troubleshooting

### Build Failures
- Check `cloudbuild.yaml` syntax
- Verify all dependencies in `package.json`
- Check build logs in Cloud Build console

### Runtime Errors
- Check Cloud Run logs: `gcloud run services logs read puda-knowledge-agent --region=europe-west1`
- Verify environment variables are set correctly
- Check database connectivity

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check database firewall rules allow Cloud Run IPs
- For Cloud SQL, verify Cloud Run service has Cloud SQL attachment and `DATABASE_URL` uses `/cloudsql/...` host

### Static Files Not Loading
- Verify build completed successfully (`dist/public` exists)
- Check `server/vite.ts` path resolution
- Verify `attached_assets` directory is copied to image

## Security Considerations

1. **Never commit `.env` files** - Use Secret Manager
2. **Use HTTPS** - Cloud Run/App Engine provide HTTPS automatically
3. **Secure cookies** - Already configured for production (`secure: true`)
4. **Database credentials** - Store in Secret Manager, not environment variables
5. **API keys** - Use Secret Manager for sensitive keys

## Scaling

- **Cloud Run**: Auto-scales based on traffic (configured: 1-10 instances)
- **App Engine**: Auto-scales based on configuration in `app.yaml`
- **Database**: Ensure database can handle increased connections

## Cost Optimization

1. **Set min-instances to 0** for development (cold starts acceptable)
2. **Use Cloud SQL Proxy** for Cloud SQL (reduces connection overhead)
3. **Enable Cloud CDN** for static assets (if using Cloud Storage)
4. **Monitor usage** in Cloud Console
