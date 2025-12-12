# Multi-stage build for Google Cloud Run
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./
COPY tsconfig.json ./
COPY drizzle.config.ts ./

# Install ALL dependencies (including devDependencies needed for build)
# This ensures build tools like vite, esbuild, typescript are available
RUN npm ci --include=dev

# Copy source files
COPY . .

# Build the application (vite builds to dist/public, esbuild bundles server to dist/index.js)
RUN npm run build

# Verify build outputs exist
RUN test -f dist/index.js || (echo "ERROR: dist/index.js not found after build" && exit 1)
RUN test -d dist/public || (echo "ERROR: dist/public directory not found after build" && exit 1)

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built files from builder
# dist/index.js - bundled server code
# dist/public - built frontend assets
COPY --from=builder /app/dist ./dist
# Copy shared schema (needed at runtime for type inference)
COPY --from=builder /app/shared ./shared
# Copy attached assets (images, etc.)
COPY --from=builder /app/attached_assets ./attached_assets

# Create uploads directory (ephemeral in Cloud Run - files lost on restart)
RUN mkdir -p /tmp/uploads/documents

# Set environment to production
ENV NODE_ENV=production
ENV PORT=8080

# Expose port (Cloud Run uses PORT env var)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Start the application
CMD ["node", "dist/index.js"]

