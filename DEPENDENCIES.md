# Application Dependencies

## Prerequisites

### 1. Node.js Runtime
- **Required Version**: Node.js 20.x or later
- Check your version: `node --version`
- Download from: https://nodejs.org/

### 2. Package Manager
- **npm** (comes with Node.js) or **yarn**/**pnpm**
- Check npm version: `npm --version`

### 3. PostgreSQL Database
- **Required**: PostgreSQL database with **pgvector** extension
- The app uses **Neon serverless** database (or compatible PostgreSQL)
- pgvector extension must be installed on the database

## Installation Steps

### 1. Install Node.js Dependencies
```bash
npm install
```

This will install all dependencies from `package.json`:
- **Runtime dependencies**: ~80 packages including:
  - React, Express, Drizzle ORM
  - UI components (Radix UI, Tailwind CSS)
  - AI SDKs (Anthropic, OpenAI)
  - Database drivers (@neondatabase/serverless)
  - And many more...

- **Development dependencies**: ~20 packages including:
  - TypeScript, Vite, ESLint
  - Build tools (esbuild, tsx)
  - Tailwind CSS and PostCSS

### 2. Database Setup
1. Provision a PostgreSQL database with pgvector extension
2. Set the `DATABASE_URL` environment variable:
   ```bash
   export DATABASE_URL="postgresql://user:password@host:port/database"
   ```
   Or create a `.env` file:
   ```
   DATABASE_URL=postgresql://user:password@host:port/database
   ```

### 3. Run Database Migrations (if needed)
```bash
npm run db:push
```

### 4. Optional: Python Service
If you need vector store operations via Python service:
- **Optional**: Python 3.x service running on port 5001 (or set `PYTHON_API_URL`)
- The app can function without this service (uses alternative LLM API service)

## Environment Variables

### Required
- `DATABASE_URL` - PostgreSQL connection string

### Optional
- `PYTHON_API_URL` - Python API service URL (default: `http://localhost:5001`)
- `NODE_ENV` - Set to `development` or `production`

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Type Checking
```bash
npm run check
```

## Key Dependencies Overview

### Frontend Framework
- React 18.3.1
- React DOM 18.3.1
- Wouter (routing)

### Backend Framework
- Express 4.21.2
- TypeScript 5.6.3

### Database
- Drizzle ORM 0.39.1
- @neondatabase/serverless 0.10.4
- pgvector 0.2.1

### UI Components
- Radix UI components (extensive set)
- Tailwind CSS 3.4.17
- Framer Motion 11.13.1
- Lucide React (icons)

### AI/ML Services
- @anthropic-ai/sdk 0.68.0
- openai 6.6.0

### Development Tools
- Vite 5.4.20
- tsx 4.20.5
- esbuild 0.25.0

## Notes
- The app uses ES modules (`"type": "module"` in package.json)
- All dependencies are managed through npm
- No Python dependencies are required for the main application (Python service is separate/optional)




