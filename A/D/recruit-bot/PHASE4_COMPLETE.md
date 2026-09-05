# Phase 4 Complete ✅

## Files Created

### Backend Infrastructure
- `src/server.js` — Express REST API server with 4 endpoints
- `src/worker.js` — Bull queue worker process for background jobs
- `src/api/queue.js` — Bull queue configuration with Redis
- `src/db/database.js` — PostgreSQL client with connection pooling
- `src/db/schema.sql` — Database schema (jobs, candidates tables)

### Deployment
- `docker-compose.yml` — Full stack: PostgreSQL, Redis, API, 2x Workers
- `Dockerfile` — Container image for API and worker

### Tests
- `tests/api.test.js` — 9 API endpoint tests (57 total passing)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (Frontend)                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Express API Server                        │
│  POST /api/jobs                                             │
│  GET /api/jobs/:id                                          │
│  GET /api/jobs/:id/results                                  │
│  GET /api/jobs (list)                                       │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
    PostgreSQL        Redis Queue      Bull Queue
    (Jobs DB)         (Job Store)       (Processor)
                                            │
                                ┌───────────┼───────────┐
                                ▼           ▼           ▼
                            Worker 1    Worker 2    Worker N
                            (LinkedIn)  (LinkedIn)  (LinkedIn)
```

## API Endpoints

### 1. POST /api/jobs — Create a new recruitment job

**Request:**
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

**Response (201 Created):**
```json
{
  "jobId": "123e4567-e89b-12d3-a456-426614174000",
  "status": "pending",
  "message": "Job created and queued for processing"
}
```

**Validation:**
- `title` (required): string, non-empty
- `location` (optional): string
- `skills` (optional): array of strings
- `maxCandidates` (optional): integer 1-200, default 50
- `enrichTopN` (optional): integer 0-100, default 20

### 2. GET /api/jobs/:id — Get job status and progress

**Request:**
```bash
curl http://localhost:3000/api/jobs/123e4567-e89b-12d3-a456-426614174000
```

**Response (200 OK):**
```json
{
  "jobId": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Senior Software Engineer",
  "location": "San Francisco Bay Area",
  "skills": ["JavaScript", "Node.js", "React"],
  "status": "running",
  "progress": 45,
  "error": null,
  "createdAt": "2026-03-15T20:00:00.000Z",
  "startedAt": "2026-03-15T20:00:05.000Z",
  "completedAt": null,
  "metadata": {}
}
```

**Status values:**
- `pending` — Job created, waiting to be processed
- `running` — Job is currently processing
- `completed` — Job finished successfully
- `failed` — Job failed after retries

### 3. GET /api/jobs/:id/results — Get completed job results

**Request:**
```bash
curl http://localhost:3000/api/jobs/123e4567-e89b-12d3-a456-426614174000/results?limit=50
```

**Response (200 OK):**
```json
{
  "jobId": "123e4567-e89b-12d3-a456-426614174000",
  "total": 52,
  "candidates": [
    {
      "id": "cand-001",
      "name": "Alice Smith",
      "headline": "Senior Software Engineer at Acme",
      "location": "San Francisco, CA",
      "profileUrl": "https://linkedin.com/in/alice",
      "imageUrl": "https://...",
      "email": "alice@example.com",
      "about": "Experienced full-stack engineer...",
      "experience": [
        {
          "title": "Senior Engineer",
          "company": "Acme",
          "duration": "3 yrs 2 mos"
        }
      ],
      "education": [
        {
          "school": "MIT",
          "degree": "BS Computer Science"
        }
      ],
      "skills": ["JavaScript", "Node.js", "React", "TypeScript", "Python"],
      "sources": ["linkedin"],
      "score": 92,
      "scoreBreakdown": {
        "skillMatch": 40,
        "experience": 30,
        "location": 20,
        "github": 2
      },
      "enrichedAt": "2026-03-15T20:05:30.000Z"
    },
    ...
  ],
  "metadata": {
    "total": 52,
    "enriched": 20,
    "sources": ["linkedin"],
    "durationSec": 287.3,
    "viewerUrls": ["https://viewer.tinyfish.io/sess_abc123"]
  }
}
```

**Query parameters:**
- `limit` (optional): max results to return, default 100

**Error responses:**
- `400` — Job not completed yet (returns status and progress)
- `404` — Job not found

### 4. GET /api/jobs — List all jobs

**Request:**
```bash
curl http://localhost:3000/api/jobs?limit=20&offset=0
```

**Response (200 OK):**
```json
{
  "jobs": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "title": "Senior Software Engineer",
      "location": "San Francisco Bay Area",
      "status": "completed",
      "progress": 100,
      "createdAt": "2026-03-15T20:00:00.000Z",
      "completedAt": "2026-03-15T20:05:00.000Z"
    },
    ...
  ],
  "limit": 20,
  "offset": 0
}
```

## Database Schema

### jobs table
```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  skills JSONB,
  max_candidates INTEGER,
  enrich_top_n INTEGER,
  status VARCHAR(50),           -- pending, running, completed, failed
  progress INTEGER,             -- 0-100
  error TEXT,
  created_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  metadata JSONB
);
```

### candidates table
```sql
CREATE TABLE candidates (
  id UUID PRIMARY KEY,
  job_id UUID REFERENCES jobs(id),
  name VARCHAR(255),
  headline TEXT,
  location VARCHAR(255),
  profile_url TEXT,
  image_url TEXT,
  email VARCHAR(255),
  about TEXT,
  experience JSONB,
  education JSONB,
  skills JSONB,
  sources JSONB,
  score INTEGER,
  score_breakdown JSONB,
  github_profile JSONB,
  enriched_at TIMESTAMP,
  created_at TIMESTAMP
);
```

## Job Queue (Bull + Redis)

**Configuration:**
- Queue name: `recruitment`
- Max attempts: 3 (with exponential backoff)
- Backoff delay: 5s, 10s, 20s
- Keep last 100 completed jobs
- Keep last 200 failed jobs

**Job data:**
```javascript
{
  jobId: "123e4567-e89b-12d3-a456-426614174000",
  title: "Senior Software Engineer",
  location: "San Francisco Bay Area",
  skills: ["JavaScript", "Node.js", "React"],
  maxCandidates: 50,
  enrichTopN: 20
}
```

**Job lifecycle:**
1. API receives POST /api/jobs
2. Creates job record in PostgreSQL (status: pending)
3. Adds job to Bull queue
4. Worker picks up job (status: running)
5. Runs RecruitmentWorkflow
6. Saves candidates to database
7. Updates job status (completed or failed)

## Worker Process

**File:** `src/worker.js`

**Features:**
- Processes jobs from Bull queue
- Runs RecruitmentWorkflow for each job
- Saves candidates to PostgreSQL
- Updates job status and progress
- Retries on failure (3 attempts)
- Graceful shutdown on SIGTERM/SIGINT

**Scaling:**
- Run multiple workers for parallel processing
- Each worker processes one job at a time
- Docker Compose runs 2 workers by default
- Can scale to N workers as needed

## Deployment

### Local Development

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your credentials

# Run with docker-compose
docker-compose up
```

**Services:**
- API: http://localhost:3000
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### Production Deployment

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f api
docker-compose logs -f worker
```

**Environment variables:**
```
TINYFISH_API_KEY=your_key
LINKEDIN_EMAIL=your_email
LINKEDIN_PASSWORD=your_password
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_HOST=redis
REDIS_PORT=6379
PORT=3000
NODE_ENV=production
```

## Rate Limiting

**API rate limits:**
- 100 requests per 15 minutes per IP
- Returns 429 Too Many Requests when exceeded

**Job queue:**
- 3 retries per job with exponential backoff
- 5s, 10s, 20s delays between retries

## Error Handling

**API errors:**
- `400` — Validation failed (missing/invalid fields)
- `404` — Resource not found
- `500` — Server error

**Job errors:**
- Caught and logged
- Job status set to `failed`
- Error message stored in database
- Retried up to 3 times

## Test Coverage

**57 tests passing:**
- TinyFish client: 5 tests
- LinkedIn auth: 5 tests
- LinkedIn search: 7 tests
- LinkedIn agent: 4 tests
- Scorer: 16 tests
- Deduplicator: 8 tests
- Workflow: 3 tests
- API endpoints: 9 tests

## Success Criteria ✅

> "I can send a POST request to /api/jobs, poll for status, and get back results when complete."

**Status:** Complete.

```bash
# 1. Create job
JOB_ID=$(curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{"title":"Engineer","location":"SF","skills":["JS"]}' \
  | jq -r '.jobId')

# 2. Poll for status
curl http://localhost:3000/api/jobs/$JOB_ID

# 3. Get results when complete
curl http://localhost:3000/api/jobs/$JOB_ID/results
```

## Next: Phase 5

Build the React frontend dashboard with real-time status updates, results grid, and ROI calculator.
