# Environment Variables for Google Cloud Deployment

## 🔴 Required Environment Variables

These must be set for the application to function:

### 1. Database Configuration
```bash
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
```
- **Required**: Yes
- **Description**: PostgreSQL connection string with pgvector extension
- **Format**: `postgresql://user:password@host:port/database`
- **Example**: `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require`
- **For Cloud SQL**: `postgresql://user:pass@/dbname?host=/cloudsql/PROJECT:REGION:INSTANCE`

### 2. OpenAI API Configuration
**Choose ONE of the following options:**

#### Option A: Standard OpenAI API
```bash
OPENAI_API_KEY=sk-...
```
- **Required**: Yes (if using OpenAI features)
- **Description**: Your OpenAI API key
- **Used for**: All AI features, document analysis, vector store operations, deep mode responses

#### Option B: Replit AI Integrations (Alternative)
```bash
AI_INTEGRATIONS_OPENAI_API_KEY=your_key
AI_INTEGRATIONS_OPENAI_BASE_URL=https://openai-proxy.replit.com/v1
```
- **Required**: Yes (if using Replit AI Integrations instead of direct OpenAI)
- **Description**: Replit AI Integrations API key and base URL
- **Note**: If both `OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_API_KEY` are set, the code prefers `AI_INTEGRATIONS_OPENAI_API_KEY`

## 🟡 Optional Environment Variables

These enhance functionality but have defaults:

### OpenAI Configuration
```bash
OPENAI_FORMATTER_MODEL=gpt-5.1
```
- **Required**: No
- **Default**: `"gpt-5.1"`
- **Description**: Model used for formatting deep mode responses
- **Used in**: Deep mode response formatting

### Application Configuration
```bash
NODE_ENV=production
PORT=8080
```
- **Required**: No (automatically set in Dockerfile)
- **Default**: `NODE_ENV=production`, `PORT=8080`
- **Description**: 
  - `NODE_ENV`: Environment mode (automatically set to `production` in Dockerfile)
  - `PORT`: Port the application listens on (automatically set to `8080` in Dockerfile)

### External Services
```bash
PYTHON_API_URL=http://localhost:5001
```
- **Required**: No
- **Default**: `http://localhost:5001`
- **Description**: Python API service URL for vector store operations
- **Note**: Application can function without this (uses alternative LLM API service)

### Anthropic API (Optional)
```bash
ANTHROPIC_API_KEY=sk-ant-...
```
- **Required**: No
- **Description**: Anthropic API key for Claude models
- **Used in**: Document analysis service (alternative to OpenAI)
- **Note**: Only needed if using Anthropic for document analysis

### LLM Service (Optional - Has Defaults)
```bash
LLM_SERVICE_URL=https://llm-api-service-vinay2k.replit.app
LLM_SERVICE_API_KEY=aa123456789bb
```
- **Required**: No
- **Default**: Hardcoded defaults in code
- **Description**: External LLM service URL and API key
- **Note**: Has fallback defaults, but can be overridden

## 📋 Complete Environment Variable List for Google Cloud

### For Cloud Run (via gcloud CLI):
```bash
gcloud run services update ekg-product \
  --region=us-central1 \
  --set-env-vars="DATABASE_URL=postgresql://user:pass@host:port/db,OPENAI_API_KEY=sk-...,NODE_ENV=production,PORT=8080"
```

### For Cloud Run (via Console):
Navigate to: Cloud Run → Your Service → Edit & Deploy New Revision → Variables & Secrets

Add these key-value pairs:

| Key | Value | Required |
|-----|-------|----------|
| `DATABASE_URL` | `postgresql://user:password@host:port/database` | ✅ Yes |
| `OPENAI_API_KEY` | `sk-...` | ✅ Yes |
| `NODE_ENV` | `production` | ⚠️ Auto-set |
| `PORT` | `8080` | ⚠️ Auto-set |
| `OPENAI_FORMATTER_MODEL` | `gpt-5.1` | ❌ Optional |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | `your_key` | ❌ Optional (alternative) |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | `https://openai-proxy.replit.com/v1` | ❌ Optional |
| `PYTHON_API_URL` | `http://your-python-service:5001` | ❌ Optional |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | ❌ Optional |

### For App Engine (via app.yaml):
Add to `env_variables` section:
```yaml
env_variables:
  DATABASE_URL: "postgresql://user:password@host:port/database"
  OPENAI_API_KEY: "sk-..."
  OPENAI_FORMATTER_MODEL: "gpt-5.1"
```

## 🔐 Security Best Practices

### Using Secret Manager (Recommended)

For sensitive values like API keys, use Google Secret Manager:

1. **Create secrets:**
```bash
echo -n "your-database-url" | gcloud secrets create database-url --data-file=-
echo -n "sk-..." | gcloud secrets create openai-api-key --data-file=-
```

2. **Grant access to Cloud Run service account:**
```bash
gcloud secrets add-iam-policy-binding database-url \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

3. **Reference in Cloud Run:**
```bash
gcloud run services update ekg-product \
  --update-secrets="DATABASE_URL=database-url:latest,OPENAI_API_KEY=openai-api-key:latest"
```

## ✅ Minimum Required for Basic Operation

For the application to start and function, you need **at minimum**:

1. `DATABASE_URL` - Database connection
2. `OPENAI_API_KEY` OR `AI_INTEGRATIONS_OPENAI_API_KEY` - AI functionality

All other variables are optional and have defaults or fallbacks.

## 🧪 Testing Environment Variables

After setting environment variables, verify they're loaded:

```bash
# Check health endpoint
curl https://your-service.run.app/api/health

# Check if database connection works (should not error)
# Check if OpenAI features work (try a query)
```

## 📝 Notes

- **NODE_ENV** and **PORT** are automatically set in the Dockerfile - you don't need to set them manually
- The application will fail to start if `DATABASE_URL` is missing
- AI features will be disabled if no OpenAI API key is provided
- All optional variables have sensible defaults or fallbacks

