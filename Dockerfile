# ──────────────────────────────────────────────
# Multi-stage Dockerfile for Vapiano Bot backend
# Builds: TypeScript backend -> production Node.js image
# ──────────────────────────────────────────────

# ── Stage 1: Build ────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (including devDependencies for tsc)
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source and compile TypeScript
COPY tsconfig.json ./
COPY src ./src/
RUN npx tsc

# ── Stage 2: Production ──────────────────────
FROM node:20-alpine

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev && npx prisma generate

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Create logs directory
RUN mkdir -p logs

# Run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

# Default to bot; override with CMD in docker-compose for API
CMD ["node", "dist/bot/index.js"]
