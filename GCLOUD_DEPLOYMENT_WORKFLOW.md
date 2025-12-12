# Google Cloud Deployment Workflow - Complete Guide

## 🎯 Overview

Your deployment uses **Google Cloud Build** + **Cloud Run** for automated CI/CD. Here's how it works:

```
Git Push → Cloud Build Trigger → Docker Build → Container Registry → Cloud Run Deploy
```

## 📋 Complete Deployment Flow

### Step 1: Git Push (You just did this!)
```bash
git push origin main
```
- Pushes code to GitHub repository
- Triggers Cloud Build automatically (if trigger is set up)

### Step 2: Cloud Build Trigger (Automatic)
When you push to `main` branch, Cloud Build automatically:
1. **Detects the push** via GitHub webhook
2. **Starts a build** using `cloudbuild.yaml`
3. **Runs on Google Cloud infrastructure** (not your local machine)

### Step 3: Docker Build (Inside Cloud Build)
The `cloudbuild.yaml` file defines these steps:

#### 3a. Build Docker Image
```yaml
- name: 'gcr.io/cloud-builders/docker'
  args:
    - 'build'
    - '-t'
    - 'gcr.io/$PROJECT_ID/ekg-product:$COMMIT_SHA'
    - '-f'
    - 'Dockerfile'
    - '.'
```

**What happens:**
1. Cloud Build clones your GitHub repo
2. Runs `docker build` using your `Dockerfile`
3. Executes the multi-stage build:
   - **Builder stage**: Installs dependencies, builds frontend (Vite), bundles server (esbuild)
   - **Runner stage**: Creates production image with only runtime dependencies
4. Tags image with commit SHA and `latest`

#### 3b. Push to Container Registry
```yaml
- name: 'gcr.io/cloud-builders/docker'
  args:
    - 'push'
    - 'gcr.io/$PROJECT_ID/ekg-product:$COMMIT_SHA'
```

**What happens:**
- Pushes built image to Google Container Registry
- Image is stored at: `gcr.io/YOUR_PROJECT_ID/ekg-product:COMMIT_SHA`

### Step 4: Deploy to Cloud Run (Automatic)
```yaml
- name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
  entrypoint: gcloud
  args:
    - 'run'
    - 'deploy'
    - 'ekg-product'
    - '--image'
    - 'gcr.io/$PROJECT_ID/ekg-product:$COMMIT_SHA'
    - '--region'
    - 'us-central1'
```

**What happens:**
1. Cloud Run creates a new revision with the new image
2. Starts container with:
   - Port: `8080` (from Dockerfile ENV)
   - Memory: `4Gi`
   - CPU: `2`
   - Min instances: `1` (always running)
   - Max instances: `10` (auto-scales)
3. Waits for health check: `/api/health`
4. Routes traffic to new revision once healthy

### Step 5: Application Startup (Inside Container)
When Cloud Run starts your container:

1. **Runs**: `node dist/index.js` (from Dockerfile CMD)
2. **Your code executes** (`server/index.ts`):
   ```javascript
   - Loads environment variables (DATABASE_URL, OPENAI_API_KEY)
   - Initializes domain registry
   - Sets up Express routes
   - Configures static file serving
   - Starts HTTP server on 0.0.0.0:8080
   ```
3. **Health check**: Cloud Run pings `/api/health`
4. **If healthy**: Traffic routes to your service
5. **If unhealthy**: Cloud Run retries or marks as failed

## 🔧 Configuration Files Explained

### `cloudbuild.yaml` - Build & Deploy Pipeline
```yaml
steps:
  # Step 1: Build Docker image
  - Builds image using Dockerfile
  
  # Step 2: Push to registry
  - Pushes image to Container Registry
  
  # Step 3: Deploy to Cloud Run
  - Deploys new revision to Cloud Run
  - Sets NODE_ENV=production
  - Configures resources (memory, CPU, scaling)
```

### `Dockerfile` - Container Definition
```dockerfile
# Builder stage
FROM node:20-alpine AS builder
- Installs all dependencies (including dev)
- Builds frontend: vite build → dist/public
- Bundles server: esbuild → dist/index.js

# Runner stage  
FROM node:20-alpine AS runner
- Installs only production dependencies
- Copies built files (dist/, shared/, attached_assets/)
- Sets ENV: NODE_ENV=production, PORT=8080
- CMD: node dist/index.js
```

### Environment Variables
**Set in Cloud Run Console** (not in code):
- `DATABASE_URL` - Your PostgreSQL connection
- `OPENAI_API_KEY` - Your OpenAI API key
- `NODE_ENV=production` - Auto-set by Dockerfile
- `PORT=8080` - Auto-set by Dockerfile

## 🚀 Two Deployment Methods

### Method 1: Automated (Recommended) ✅
**What you have set up:**
- Cloud Build trigger watches `main` branch
- Every `git push` → automatic build & deploy

**Workflow:**
```bash
# You do this:
git push origin main

# Google Cloud does this automatically:
1. Cloud Build detects push
2. Builds Docker image
3. Pushes to registry
4. Deploys to Cloud Run
5. Your app is live!
```

### Method 2: Manual Deployment
If you need to deploy manually:

```bash
# 1. Build and push image
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/ekg-product

# 2. Deploy to Cloud Run
gcloud run deploy ekg-product \
  --image gcr.io/YOUR_PROJECT_ID/ekg-product \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 4Gi \
  --cpu 2 \
  --set-env-vars "DATABASE_URL=...,OPENAI_API_KEY=..."
```

## 📊 What Happens During Build

### Inside Docker Build (Builder Stage):
```bash
1. npm ci --include=dev          # Install all dependencies
2. npm run build                 # Build application
   ├─ vite build                # → dist/public (frontend)
   └─ esbuild server/index.ts   # → dist/index.js (server)
3. Verify outputs exist
```

### Inside Docker Build (Runner Stage):
```bash
1. npm ci --only=production     # Install runtime deps only
2. Copy dist/                   # Built application
3. Copy shared/                 # Shared schema
4. Copy attached_assets/        # Static assets
5. Create /tmp/uploads/documents # Upload directory
```

### Inside Cloud Run Container (Runtime):
```bash
1. node dist/index.js           # Start application
2. Load environment variables
3. Initialize domain registry
4. Set up Express routes
5. Start HTTP server on 0.0.0.0:8080
6. Health check: /api/health
```

## 🔍 Monitoring Deployment

### View Build Logs:
```bash
# List recent builds
gcloud builds list

# View specific build logs
gcloud builds log BUILD_ID
```

### View Cloud Run Logs:
```bash
# Stream logs
gcloud run services logs read ekg-product --region=us-central1 --follow

# Or in Console:
# Cloud Run → ekg-product → Logs tab
```

### Check Deployment Status:
```bash
# Get service info
gcloud run services describe ekg-product --region=us-central1

# Get service URL
gcloud run services describe ekg-product --region=us-central1 --format="value(status.url)"
```

## ⚙️ Environment Variables Setup

### Option 1: Cloud Console (Easiest)
1. Go to **Cloud Run** → **ekg-product** → **Edit & Deploy New Revision**
2. Click **"Variables & Secrets"** tab
3. Add variables:
   - `DATABASE_URL` = `your_database_connection_string`
   - `OPENAI_API_KEY` = `your_openai_key`
4. Click **"Deploy"**

### Option 2: gcloud CLI
```bash
gcloud run services update ekg-product \
  --region=us-central1 \
  --set-env-vars="DATABASE_URL=postgresql://...,OPENAI_API_KEY=sk-..."
```

### Option 3: Secret Manager (Most Secure)
```bash
# Create secrets
echo -n "your-db-url" | gcloud secrets create database-url --data-file=-
echo -n "your-api-key" | gcloud secrets create openai-api-key --data-file=-

# Grant access
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")
gcloud secrets add-iam-policy-binding database-url \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Reference in Cloud Run
gcloud run services update ekg-product \
  --region=us-central1 \
  --update-secrets="DATABASE_URL=database-url:latest,OPENAI_API_KEY=openai-api-key:latest"
```

## 🎯 Current Status

Based on your setup:

✅ **Automated Deployment**: Cloud Build trigger watches `main` branch  
✅ **Dockerfile**: Multi-stage build configured  
✅ **Cloud Run**: Service configured with proper resources  
✅ **Health Check**: `/api/health` endpoint ready  
✅ **Port Configuration**: Fixed to listen on `0.0.0.0:8080`  

## 🚨 Troubleshooting

### Build Fails:
- Check Cloud Build logs
- Verify `Dockerfile` syntax
- Ensure all dependencies in `package.json`

### Container Won't Start:
- Check Cloud Run logs
- Verify environment variables are set
- Check database connectivity
- Verify port 8080 is listening

### Health Check Fails:
- Verify `/api/health` endpoint works
- Check server logs for errors
- Ensure server starts within timeout (300s)

## 📝 Next Steps

1. **Set Environment Variables** in Cloud Run Console
2. **Monitor First Deployment** in Cloud Build logs
3. **Verify Health Check** after deployment
4. **Test Application** at Cloud Run URL

Your deployment is fully automated - just push to `main` and Google Cloud handles the rest! 🚀

