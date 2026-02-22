# EKG Product - Enterprise Knowledge Graph

An enterprise-grade AI-powered knowledge agent for PUDA urban development and administration, featuring:
- Conversational AI with deep research capabilities
- Document analysis and cross-document querying
- Report generation (BRD, Company Research, RFP Response)
- Investment portal with workflow management

## Tech Stack

- **Frontend**: React 18, TypeScript, TailwindCSS, Shadcn/UI
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Embedded Knowledge Engine**: Python FastAPI EKG workflow (bundled in `ekg_engine/`)
- **AI**: OpenAI GPT-4o, Responses API with web_search
- **Build**: Vite (frontend), esbuild (backend)

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 14+ database (local or cloud)
- OpenAI API key

### Installation

```bash
# Install dependencies
npm install

# Set up embedded EKG engine Python environment (one-time)
npm run ekg:setup

# Set up environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL, OPENAI_API_KEY, and vector store IDs

# Optional: auto-resolve vector store IDs by name/id and write to .env
# (uses OPENAI_API_KEY or AI_INTEGRATIONS_OPENAI_API_KEY)
npm run vectorstores:list -- --doc-name "<doc-store-name-or-id>" --kg-name "<kg-store-name-or-id>" --write-env

# Initialize local database (ensures pgvector, pushes schema, seeds users)
npm run db:init

# Start development server
npm run dev
```

The app will be available at http://localhost:5000

Local login credentials:
- Username: `user123`
- Password: `password123`

Embedded EKG architecture details: [EMBEDDED_EKG_ENGINE.md](./EMBEDDED_EKG_ENGINE.md)

### Production Build

```bash
npm run build
npm start
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `OPENAI_API_KEY` | Yes (for AI features) | OpenAI API key |
| `DOC_VECTOR_STORE_ID` | Yes (for EKG answers) | Primary OpenAI vector store ID |
| `KG_VECTOR_STORE_ID` | Yes (for EKG answers) | KG discovery vector store ID |
| `PUDA_ACTS_REGULATIONS_KG_PATH` | Yes | KG path for the primary PUDA domain (use `gs://...` in production) |
| `PUDA_ACTS_REGULATIONS_VECTOR_STORE_ID` | No | Domain override for primary PUDA vector store |
| `EKG_DEFAULT_DOMAIN` | No | Defaults to `puda_acts_regulations` |
| `EKG_ENGINE_MODE` | No | `embedded` (default) or `external` |
| `EKG_DEEP_MODEL` | No | Deep mode model (default: `gpt-5.1`) |
| `EKG_DEEP_BACKGROUND_MODE` | No | Async deep polling switch (default: `false`) |
| `NODE_ENV` | No | `development` or `production` |
| `PORT` | No | Server port (default: 5000) |
| `OPENAI_REPORT_MODEL` | No | Model for report generation (default: gpt-4o) |

Vector store helper:

```bash
# List all vector stores visible to your API key
npm run vectorstores:list

# Resolve and save DOC/KG vector stores + KG path
npm run vectorstores:list -- \
  --doc-name "<doc-store-name-or-id>" \
  --kg-name "<kg-store-name-or-id>" \
  --kg-path "gs://your-bucket/path/to/puda_master_kg.json" \
  --write-env
```

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Utilities
├── server/                 # Express backend
│   ├── services/           # Business logic services
│   ├── routes.ts           # API routes
│   ├── storage.ts          # Database operations
│   └── vite.ts             # Dev server setup
├── shared/                 # Shared code
│   └── schema.ts           # Database schema
└── docs/                   # Documentation
```

## Key Features

### 1. Conversational AI
- Multi-mode responses (concise, balanced, deep)
- Response caching with semantic similarity
- Deep research mode with web search
- EKG V2 retrieval pipeline (step-back intent, KG expansion, and Responses API `file_search`)
- Repository-only fallback behavior for insufficient evidence: `not enough information available`

### Deep Mode Note
- Default deep mode runs synchronously with `EKG_DEEP_MODEL=gpt-5.1` to avoid org-verification gating for `o3-deep-research`.
- If your OpenAI organization is verified for `o3-deep-research`, you can opt into async deep polling by setting:
  - `EKG_DEEP_MODEL=o3-deep-research`
  - `EKG_DEEP_BACKGROUND_MODE=true`

### 2. Report Generation
- **BRD**: 3,000+ words, 6 comprehensive sections
- **Company Research**: 10,000+ words, 8 detailed sections
- **RFP Response**: 5,000+ words, 7 structured sections

### 3. Document Analysis
- PDF/DOCX upload and analysis
- Cross-document querying
- AI-powered insights extraction

### 4. Investment Portal
- Workflow-based approval system
- Document management
- Task tracking

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed Google Cloud deployment instructions.
For phased Cloud SQL migration after local stabilization, see [CLOUD_SQL_MIGRATION_PLAN.md](./CLOUD_SQL_MIGRATION_PLAN.md).

### Quick Deploy to Cloud Run

```bash
# Build and deploy
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/ekg-product
gcloud run deploy ekg-product \
  --image gcr.io/YOUR_PROJECT_ID/ekg-product \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "DATABASE_URL=your_db_url,OPENAI_API_KEY=your_key"
```

## API Endpoints

### Chat & Query
- `POST /api/query` - Submit a query
- `GET /api/threads` - List conversation threads
- `GET /api/threads/:id/messages` - Get thread messages

### Documents
- `POST /api/documents/upload` - Upload document
- `POST /api/documents/analyze` - Analyze document
- `POST /api/documents/query` - Query across documents

### Health
- `GET /api/health` - Health check endpoint

## Development

```bash
# Run development server
npm run dev

# Type check
npm run check

# Database migrations
npm run db:push
```

## License

MIT
