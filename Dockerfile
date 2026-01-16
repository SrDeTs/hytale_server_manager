# ==========================================
# Stage 1: Build
# ==========================================
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy package files for dependency installation
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/server/package.json ./packages/server/
COPY packages/frontend/package.json ./packages/frontend/

# Install all dependencies (including dev for building)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/server ./packages/server
COPY packages/frontend ./packages/frontend

# Build all packages
RUN pnpm build

# ==========================================
# Stage 2: Production
# ==========================================
FROM node:20-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache openssl

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S hsm && \
    adduser -S hsm -u 1001 -G hsm

# Copy built backend
COPY --from=builder /app/packages/server/dist ./dist
COPY --from=builder /app/packages/server/package.json ./
COPY --from=builder /app/packages/server/prisma ./prisma

# Copy frontend build to public directory (backend serves this in production)
COPY --from=builder /app/packages/frontend/dist ./public

# Copy config templates
COPY packages/server/.env.example ./.env.example

# Install production dependencies only
RUN npm install --omit=dev

# Generate Prisma client
RUN npx prisma generate

# Create data directories
RUN mkdir -p /app/data/db /app/data/servers /app/data/backups /app/data/logs /app/data/certs && \
    chown -R hsm:hsm /app

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Set environment variables
ENV NODE_ENV=production
ENV HSM_BASE_PATH=/app
ENV PORT=3001
ENV HOST=0.0.0.0
ENV DATABASE_URL=file:/app/data/db/hytalepanel.db
ENV DATA_PATH=/app/data
ENV SERVERS_BASE_PATH=/app/data/servers
ENV BACKUPS_BASE_PATH=/app/data/backups
ENV LOGS_PATH=/app/data/logs
ENV CERTS_PATH=/app/data/certs
ENV HTTPS_ENABLED=false
ENV CORS_ORIGIN=http://localhost:3001

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Switch to non-root user
USER hsm

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
