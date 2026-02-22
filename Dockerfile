# Multi-stage build for Google Cloud Run
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Python runtime needed for embedded EKG engine
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-venv \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Copy package files first for better layer caching
COPY package*.json ./
COPY tsconfig.json ./
COPY drizzle.config.ts ./

# Install ALL dependencies (including devDependencies needed for build)
RUN npm ci --include=dev

# Prime Python dependencies layer (no --no-deps to avoid missing runtime deps like uvicorn)
COPY ekg_engine/pyproject.toml /app/ekg_engine/pyproject.toml
COPY ekg_engine/requirements.txt /app/ekg_engine/requirements.txt
RUN python3 -m venv /app/ekg_engine/.venv \
    && /app/ekg_engine/.venv/bin/pip install --upgrade pip \
    && /app/ekg_engine/.venv/bin/pip install -r /app/ekg_engine/requirements.txt

# Copy source files
COPY . .

# Install local embedded EKG package and verify dependency health
RUN /app/ekg_engine/.venv/bin/pip install -e /app/ekg_engine \
    && /app/ekg_engine/.venv/bin/pip check

# Build the application (vite builds to dist/public, esbuild bundles server to dist/index.js)
RUN npm run build

# Verify build outputs exist
RUN test -f dist/index.js || (echo "ERROR: dist/index.js not found after build" && exit 1)
RUN test -d dist/public || (echo "ERROR: dist/public directory not found after build" && exit 1)

# Production stage
FROM node:20-bookworm-slim AS runner

WORKDIR /app

# Python runtime needed for embedded EKG engine
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/ekg_engine ./ekg_engine
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/attached_assets ./attached_assets
COPY --from=builder /app/docs ./docs

# Create uploads directory (ephemeral in Cloud Run - files lost on restart)
RUN mkdir -p /tmp/uploads/documents

# Set environment to production
ENV NODE_ENV=production \
    EKG_ENGINE_MODE=embedded \
    EKG_ENGINE_AUTO_START=true \
    EKG_ENGINE_PYTHON_BIN=/app/ekg_engine/.venv/bin/python

# Expose default HTTP port
EXPOSE 8080

# Start the application (binds to Cloud Run provided PORT env var)
CMD ["node", "dist/index.js"]
