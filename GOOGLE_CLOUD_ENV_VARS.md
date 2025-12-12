# Environment Variables for Google Cloud Deployment

## 📋 Variables Currently Configured in Your Local Environment

Based on your `.env` file, you have the following variables configured:

### ✅ Variables Found:
1. `DATABASE_URL` - PostgreSQL connection string
2. `OPENAI_API_KEY` - OpenAI API key
3. `VITE_BYPASS_AUTH` - Frontend auth bypass (development only)

## 🔐 How to View Your Actual Values (Locally)

**⚠️ SECURITY WARNING: Never share these values publicly or commit them to Git!**

To view your actual credential values locally:

```bash
# View .env file (LOCAL ONLY - never commit this!)
cat .env

# Or view specific variable
grep "DATABASE_URL" .env
grep "OPENAI_API_KEY" .env
```

## 📤 Setting These in Google Cloud

### Option 1: Via Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **Cloud Run** → Your Service → **Edit & Deploy New Revision**
3. Click **"Variables & Secrets"** tab
4. Click **"Add Variable"** for each:

   | Variable Name | Value (from your .env) |
   |--------------|------------------------|
   | `DATABASE_URL` | Copy from your `.env` file |
   | `OPENAI_API_KEY` | Copy from your `.env` file |

5. Click **"Deploy"**

### Option 2: Via gcloud CLI

```bash
# First, get your values from .env (run locally)
export DATABASE_URL=$(grep DATABASE_URL .env | cut -d '=' -f2-)
export OPENAI_API_KEY=$(grep OPENAI_API_KEY .env | cut -d '=' -f2-)

# Then set them in Cloud Run
gcloud run services update ekg-product \
  --region=us-central1 \
  --set-env-vars="DATABASE_URL=$DATABASE_URL,OPENAI_API_KEY=$OPENAI_API_KEY"
```

### Option 3: Using Secret Manager (Recommended for Production)

```bash
# Create secrets from your .env values
export DATABASE_URL=$(grep DATABASE_URL .env | cut -d '=' -f2-)
export OPENAI_API_KEY=$(grep OPENAI_API_KEY .env | cut -d '=' -f2-)

# Create secrets in Secret Manager
echo -n "$DATABASE_URL" | gcloud secrets create database-url --data-file=-
echo -n "$OPENAI_API_KEY" | gcloud secrets create openai-api-key --data-file=-

# Grant Cloud Run access
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")
gcloud secrets add-iam-policy-binding database-url \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding openai-api-key \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Reference secrets in Cloud Run
gcloud run services update ekg-product \
  --region=us-central1 \
  --update-secrets="DATABASE_URL=database-url:latest,OPENAI_API_KEY=openai-api-key:latest"
```

## ✅ Quick Reference: What You Need

**Minimum Required:**
- `DATABASE_URL` - Your PostgreSQL connection string
- `OPENAI_API_KEY` - Your OpenAI API key

**Auto-Set (No Action Needed):**
- `NODE_ENV=production` (set in Dockerfile)
- `PORT=8080` (set in Dockerfile)

**Optional:**
- `OPENAI_FORMATTER_MODEL=gpt-5.1` (has default)
- `PYTHON_API_URL` (only if using external Python service)
- `ANTHROPIC_API_KEY` (only if using Anthropic)

## 🔍 Verify Your Values

After setting in Google Cloud, verify they're loaded:

```bash
# Check Cloud Run service environment variables
gcloud run services describe ekg-product \
  --region=us-central1 \
  --format="value(spec.template.spec.containers[0].env)"
```

## 📝 Notes

- **Never commit `.env` file** - It's already in `.gitignore`
- **Use Secret Manager** for production deployments
- **Rotate credentials** if they're ever exposed
- Your local `.env` values are what you need to copy to Google Cloud

