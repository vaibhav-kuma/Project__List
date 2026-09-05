# Phase 4 Quick Start

## Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- PostgreSQL 15+ (if running without Docker)
- Redis 7+ (if running without Docker)

## Running with Docker Compose (Recommended)

```bash
# 1. Copy environment file
cp .env.example .env

# 2. Edit .env with your credentials
# TINYFISH_API_KEY=your_key
# LINKEDIN_EMAIL=your_email
# LINKEDIN_PASSWORD=your_password

# 3. Start all services
docker-compose up

# 4. Wait for services to be healthy (30-60 seconds)
# You'll see: "api_1 | API server listening on port 3000"
```

## Running Locally (Development)

```bash
# 1. Install dependencies
npm install

# 2. Start PostgreSQL
# Option A: Docker
docker run -d \
  -e POSTGRES_DB=recruitbot \
  -e POSTGRES_USER=recruitbot \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  postgres:15-alpine

# Option B: Local PostgreSQL
createdb recruitbot
psql recruitbot < src/db/schema.sql

# 3. Start Redis
# Option A: Docker
docker run -d -p 6379:6379 redis:7-alpine

# Option B: Local Redis
redis-server

# 4. Copy and edit .env
cp .env.example .env

# 5. Start API server (in one terminal)
npm run dev

# 6. Start worker (in another terminal)
npm run worker
```

## Testing the API

### 1. Create a Job

```bash
curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Senior Software Engineer",
    "location": "San Francisco Bay Area",
    "skills": ["JavaScript", "Node.js", "React"],
    "maxCandidates": 50,
    "enrichTopN": 20
  }'
```

**Response:**
```json
{
  "jobId": "123e4567-e89b-12d3-a456-426614174000",
  "status": "pending",
  "message": "Job created and queued for processing"
}
```

### 2. Check Job Status

```bash
curl http://localhost:3000/api/jobs/123e4567-e89b-12d3-a456-426614174000
```

**Response:**
```json
{
  "jobId": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Senior Software Engineer",
  "status": "running",
  "progress": 45,
  "createdAt": "2026-03-15T20:00:00.000Z",
  "startedAt": "2026-03-15T20:00:05.000Z",
  "completedAt": null
}
```

### 3. Get Results (when completed)

```bash
curl http://localhost:3000/api/jobs/123e4567-e89b-12d3-a456-426614174000/results
```

**Response:**
```json
{
  "jobId": "123e4567-e89b-12d3-a456-426614174000",
  "total": 52,
  "candidates": [
    {
      "name": "Alice Smith",
      "headline": "Senior Software Engineer at Acme",
      "location": "San Francisco, CA",
      "score": 92,
      "scoreBreakdown": {
        "skillMatch": 40,
        "experience": 30,
        "location": 20,
        "github": 2
      },
      "skills": ["JavaScript", "Node.js", "React", "TypeScript"],
      ...
    },
    ...
  ]
}
```

## Monitoring

### View API Logs

```bash
docker-compose logs -f api
```

### View Worker Logs

```bash
docker-compose logs -f worker
```

### View Database

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U recruitbot -d recruitbot

# List jobs
SELECT id, title, status, progress, created_at FROM jobs ORDER BY created_at DESC;

# List candidates for a job
SELECT name, score, headline FROM candidates WHERE job_id = '...' ORDER BY score DESC;
```

### View Redis Queue

```bash
# Connect to Redis
docker-compose exec redis redis-cli

# List queue info
KEYS recruitment*
LLEN recruitment:jobs
```

## Scaling

### Run More Workers

Edit `docker-compose.yml`:

```yaml
worker:
  deploy:
    replicas: 5  # Increase from 2 to 5
```

Then restart:

```bash
docker-compose up -d --scale worker=5
```

## Troubleshooting

### API won't start

```bash
# Check if port 3000 is in use
lsof -i :3000

# Check logs
docker-compose logs api
```

### Worker won't process jobs

```bash
# Check Redis connection
docker-compose exec redis redis-cli ping

# Check PostgreSQL connection
docker-compose exec postgres psql -U recruitbot -d recruitbot -c "SELECT 1"

# Check worker logs
docker-compose logs worker
```

### Database connection error

```bash
# Verify DATABASE_URL in .env
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

### Jobs stuck in pending

```bash
# Check if workers are running
docker-compose ps

# Restart workers
docker-compose restart worker
```

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/api.test.js

# Run with coverage
npm test -- --coverage
```

## Cleanup

```bash
# Stop all services
docker-compose down

# Remove volumes (database data)
docker-compose down -v

# Remove images
docker-compose down --rmi all
```

## Next Steps

- Phase 5: Build the React frontend dashboard
- Phase 6: Add error handling and resilience features
- Phase 7: Add live session viewer and demo mode
- Phase 8: Prepare for hackathon demo
