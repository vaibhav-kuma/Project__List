# Multi-stage Dockerfile for DealScout
FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    curl \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Create app directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S dealscout -u 1001

# Frontend build stage
FROM base AS frontend-builder

# Copy frontend package files
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci

# Copy frontend source
COPY frontend/ ./frontend/

# Build frontend
RUN cd frontend && npm run build

# Backend dependencies stage
FROM base AS backend-deps

# Copy backend package files
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base AS development

# Copy backend dependencies
COPY --from=backend-deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Create required directories
RUN mkdir -p logs data/sessions && \
    chown -R dealscout:nodejs logs data

USER dealscout

EXPOSE 3001

CMD ["dumb-init", "node", "src/server.js"]

# Production stage
FROM base AS production

# Copy backend dependencies
COPY --from=backend-deps /app/node_modules ./node_modules

# Copy built frontend
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Copy backend source
COPY src/ ./src/
COPY package*.json ./

# Create required directories and set permissions
RUN mkdir -p logs data/sessions && \
    chown -R dealscout:nodejs /app

# Switch to non-root user
USER dealscout

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Expose port
EXPOSE 3001

# Start application
CMD ["dumb-init", "node", "src/server.js"]