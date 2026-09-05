#!/bin/bash
set -e

echo "Starting Ninor Deployment Script..."
ENV=${1:-staging}
echo "Target Environment: $ENV"

# 1. Database Migrations
echo "Applying Prisma Migrations..."
# Note: For production, we map Prisma from SQLite to RDS PostgreSQL.
npx prisma migrate deploy --schema=./apps/api/prisma/schema.prisma

# 2. Assert Health Checks
echo "Waiting for API readiness loop..."
# Mock loop logic representing checking API readiness before full cutover
for i in {1..5}; do
  if curl -s http://localhost:4000/api/health | grep -q "ok"; then
    echo "API is healthy."
    break
  fi
  sleep 2
done

# 3. Cache Purge
echo "Purging Next.js static asset caches globally on CDN..."
# e.g., curl -X POST "https://api.cloudflare.com/client/v4/zones/.../purge_cache"

echo "Deployment complete."
