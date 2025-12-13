# EKG Product - Enterprise Knowledge Graph

An enterprise-grade AI-powered knowledge agent for wealth management, featuring:
- Conversational AI with deep research capabilities
- Document analysis and cross-document querying
- Report generation (BRD, Company Research, RFP Response)
- Investment portal with workflow management

## Tech Stack

- **Frontend**: React 18, TypeScript, TailwindCSS, Shadcn/UI
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **AI**: OpenAI GPT-4o, Responses API with web_search
- **Build**: Vite (frontend), esbuild (backend)

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL database (Neon recommended)
- OpenAI API key

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL and OPENAI_API_KEY

# Initialize database schema
npm run db:push

# Start development server
npm run dev
```

The app will be available at http://localhost:5000

### Production Build

```bash
npm run build
npm start
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `NODE_ENV` | No | `development` or `production` |
| `PORT` | No | Server port (default: 5000) |
| `OPENAI_REPORT_MODEL` | No | Model for report generation (default: gpt-4o) |

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

