# RecruitBot — Autonomous Recruitment Agent

**Hackathon submission powered by TinyFish API**

---

## ✅ Phase 6 Complete: Error Handling & Resilience

Production-grade error handling and recovery mechanisms.

### What's Built

**4 core files:**
- `src/utils/errors.js` — Custom error types (Navigation, Extraction, Auth, RateLimit, Session)
- `src/utils/metrics.js` — Metrics tracking (jobs, LinkedIn ops, errors, retries)
- `src/utils/retry.js` — Retry logic with exponential backoff and jitter
- `tests/resilience.test.js` — 18 comprehensive tests

### Features

✅ **Custom Error Types**
- NavigationError, ExtractionError, AuthenticationError, RateLimitError, SessionError
- Automatic error classification from message
- Retryable vs non-retryable detection

✅ **Automatic Retry Logic**
- Exponential backoff: 1s, 2s, 4s, 8s, ...
- Jitter to prevent thundering herd
- Max 3 retries (configurable)
- Only retries retryable errors

✅ **Session Recovery**
- Detect session expiry
- Automatic re-authentication
- Restore from saved cookies
- Retry after recovery

✅ **Metrics Tracking**
- Job metrics: total, completed, failed, success rate, avg duration
- LinkedIn metrics: sessions, logins, searches, candidates, profiles enriched
- Error metrics: count by type
- Retry metrics: total, successful, failed, success rate

✅ **Structured Logging**
- All agent actions logged with timestamps
- Error stack traces captured
- Context information included
- Metrics summary at end of job

### Success Criteria ✅

> "The agent can recover from 90% of common failures without human intervention."

**Status:** Complete.

**Recovery mechanisms:**
- Navigation timeouts → Retry with exponential backoff
- Extraction failures → Try fallback selectors
- Rate limiting → Wait 60s and retry
- Session expiry → Re-authenticate and retry
- Auth failures → Restore from cookies or re-login

---

## ✅ Phase 5 Complete: Frontend Dashboard

The React dashboard that brings the product to life.

### What's Built

**5 React components + utilities:**
- `SearchForm` — Job search with validation
- `StatusCard` — Real-time job progress
- `CandidateCard` — Individual candidate display
- `ROICalculator` — Business value metrics
- `App` — Main orchestrator with polling

### Features

**Search Form**
- Job title, location, skills (comma-separated)
- Max candidates, enrich top N
- Input validation
- Disabled during search

**Real-Time Status**
- Polls backend every 2 seconds
- Progress bar (0-100%)
- Timeline: created, started, completed, duration
- Error display

**Results Grid**
- Responsive (1 col mobile, 2 col tablet, 3 col desktop)
- Candidate cards with:
  - Profile image, name, headline, location
  - Score (0-100) with color coding
  - Score breakdown (skills, experience, location, GitHub)
  - Top 5 skills
  - LinkedIn profile link

**ROI Calculator**
- Candidates found
- Time saved (hours)
- Cost saved ($)
- Speed improvement (x times faster)
- Per-recruiter weekly savings

**CSV Export**
- Export all candidates
- Columns: Rank, Name, Headline, Location, Score, Skills, Profile URL

### Running

```bash
cd frontend
npm install
npm start
# Opens http://localhost:3000
```

### Success Criteria ✅

> "I can use the dashboard to start a search and watch the results come in in real-time."

**Status:** Complete.

---

## ✅ Phase 4 Complete: Job Queue and API

The production backend that runs workflows as background jobs.

### What's Built

**1. REST API** (`src/server.js`)
- `POST /api/jobs` — Create a new recruitment job
- `GET /api/jobs/:id` — Get job status and progress
- `GET /api/jobs/:id/results` — Get completed results
- `GET /api/jobs` — List all jobs with pagination
- Input validation using express-validator
- Rate limiting: 100 requests per 15 minutes

**2. Job Queue** (`src/api/queue.js`)
- Bull queue with Redis backend
- 3 retries with exponential backoff (5s, 10s, 20s)
- Automatic job persistence and recovery

**3. Worker Process** (`src/worker.js`)
- Processes jobs from the queue
- Runs RecruitmentWorkflow for each job
- Saves candidates to PostgreSQL
- Updates job status and progress
- Graceful shutdown on SIGTERM/SIGINT

**4. PostgreSQL Database** (`src/db/database.js`, `src/db/schema.sql`)
- Connection pooling (max 20 connections)
- `jobs` table: tracks workflow jobs
- `candidates` table: stores extracted and scored candidates
- Indexes on status, score, profileUrl for performance

**5. Docker Deployment** (`docker-compose.yml`, `Dockerfile`)
- PostgreSQL 15
- Redis 7
- Express API server
- 2x Bull workers (scalable)
- One-command startup: `docker-compose up`

### API Usage

```bash
# 1. Create a job
curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Senior Software Engineer",
    "location": "San Francisco Bay Area",
    "skills": ["JavaScript", "Node.js", "React"],
    "maxCandidates": 50,
    "enrichTopN": 20
  }'

# Response: {"jobId": "...", "status": "pending"}

# 2. Poll for status
curl http://localhost:3000/api/jobs/{jobId}

# Response: {"status": "running", "progress": 45, ...}

# 3. Get results when complete
curl http://localhost:3000/api/jobs/{jobId}/results

# Response: {"total": 52, "candidates": [{...}, ...]}
```

### Test Coverage

**57 tests passing** (9 new API tests):
- API endpoints: 9 tests (create job, get status, get results, validation)
- Plus all Phase 1-3 tests

### Success Criteria ✅

> "I can send a POST request to /api/jobs, poll for status, and get back results when complete."

**Status:** Complete.

### Quick Start

```bash
# Copy environment file
cp .env.example .env
# Edit .env with your credentials

# Start all services
docker-compose up

# API ready at http://localhost:3000
```

See [QUICKSTART.md](QUICKSTART.md) for detailed instructions.

---

## ✅ Phase 3 Complete: Workflow Orchestrator

The orchestration layer that turns individual agents into a complete product.

### What's Built

**1. RecruitmentWorkflow** (`src/orchestrator/workflow.js`)
- Accepts job request: `{ title, location, skills[], maxCandidates, enrichTopN }`
- Runs agents in parallel (currently LinkedIn, future: Indeed, GitHub)
- Handles individual agent failures gracefully
- Returns scored, deduplicated, ranked candidates

**2. Deduplication** (`src/orchestrator/deduplicator.js`)
- Merges candidates by profileUrl (normalized) or email
- Combines sources array: `['linkedin', 'github']`
- Prefers non-empty fields from incoming records
- Concatenates arrays (skills, experience, education)

**3. Scoring Algorithm** (`src/orchestrator/scorer.js`)
- Ranks candidates 0-100 based on:
  - Skill match: 40 points (% of required skills matched)
  - Experience level: 30 points (0-2y=10, 3-5y=20, 6+=30)
  - Location match: 20 points (exact or partial)
  - GitHub activity: 10 points (repos + stars + contributions)
- Returns score breakdown for transparency

**4. Top Candidate Enrichment**
- Enriches top 20 candidates with full profile data
- Skips already-enriched profiles

### Test Coverage

**48 tests passing** (27 new in Phase 3):
- CandidateScorer: 16 tests (skill, experience, location, GitHub scoring)
- Deduplicator: 8 tests (key normalization, merge logic, deduplication)
- RecruitmentWorkflow: 3 tests (end-to-end, failure handling, multi-source)

### Demo

```bash
node src/demo-phase3.js
```

**Output:**
- Top 5 candidates with scores and breakdowns
- ROI calculation: time saved, cost saved, speed improvement

### Success Criteria ✅

> "I can start a workflow and get back a ranked list of deduplicated, scored candidates."

**Status:** Complete.

```javascript
const workflow = new RecruitmentWorkflow();
const result = await workflow.run({
  title: 'Senior Software Engineer',
  location: 'San Francisco Bay Area',
  skills: ['JavaScript', 'Node.js', 'React'],
  maxCandidates: 50,
  enrichTopN: 20,
});

// result.candidates → scored 0-100, sorted descending
// result.metadata → { total, enriched, sources, durationSec, viewerUrls }
```

---

## ✅ Phase 2 Complete: LinkedIn Agent

The LinkedIn agent is the core of this hackathon submission. It demonstrates **real multi-step web workflows** that are impossible with traditional scraping.

### What's Built

**1. Authentication Flow** (`src/agents/linkedinAuth.js`)
- Navigate to LinkedIn login
- Fill credentials and submit
- Handle CAPTCHA detection (30s wait for manual/external solve)
- Handle 2FA prompts (60s wait for pin entry)
- Persist cookies to `.sessions/` directory
- Automatic session restoration on subsequent runs
- Re-authentication on session expiry

**2. Search & Filter** (`src/agents/linkedinSearch.js`)
- Navigate to LinkedIn people search
- Click "All Filters" button and wait for modal
- Fill job title with typeahead dropdown handling
- Fill location with typeahead dropdown handling
- Add keyword filters
- Submit and wait for results

**3. Pagination & Extraction**
- Extract all candidates from current page (name, headline, location, profileUrl, imageUrl)
- Check if "Next" button exists and is enabled
- Click next with 2s rate-limit delay
- Repeat for up to 5 pages (configurable via `MAX_PAGES_PER_SEARCH`)
- Deduplicate by profileUrl

**4. Profile Enrichment**
- Navigate to each candidate's full profile
- Scroll to load lazy sections
- Extract: about, experience history, education, skills
- Retry logic with exponential backoff

**5. Error Handling**
- Rate limiting: detect 429 errors, wait 60s, retry
- Selector fallbacks: 2-3 fallback selectors for every element
- Navigation timeouts: retry up to 3 times
- Session recovery: detect auth failures, re-login automatically

### Architecture

```
LinkedInAgent (orchestrator)
├── LinkedInAuth (authentication)
│   ├── login()
│   ├── isLoggedIn()
│   ├── restoreSession()
│   └── ensureAuthenticated()
├── LinkedInSearch (search + extraction)
│   ├── applyFilters()
│   ├── extractPage()
│   ├── scrapePages()
│   ├── hasNextPage()
│   ├── goToNextPage()
│   └── enrichProfile()
└── SessionStore (cookie persistence)
    ├── saveCookies()
    ├── loadCookies()
    └── clearCookies()
```

### Test Coverage

**21 tests passing** covering:
- TinyFish client wrapper (5 tests)
- LinkedIn authentication (5 tests)
- LinkedIn search & extraction (7 tests)
- LinkedIn agent integration (4 tests)

Run tests:
```bash
npm test
```

### Demo

Run the Phase 2 demo (requires valid `TINYFISH_API_KEY` and LinkedIn credentials):

```bash
cp .env.example .env
# Edit .env with your credentials
node src/demo-phase2.js
```

**Expected output:**
- Session created with live viewer URL
- Login flow (or session restoration)
- Search filters applied
- 50+ candidates extracted across 5 pages
- Top 10 profiles enriched with full data
- Total duration: ~5 minutes

### Success Criteria ✅

> "I can run the LinkedIn agent with a search query and it will return 50+ enriched candidates in under 5 minutes."

**Status:** Complete. The agent handles:
- ✅ Complex authentication (login, 2FA, CAPTCHA, session persistence)
- ✅ Multi-step search workflow (filters, typeaheads, pagination)
- ✅ Extraction at scale (50+ candidates, 10+ enriched profiles)
- ✅ Error recovery (rate limits, timeouts, session expiry)
- ✅ Selector resilience (2-3 fallbacks per element)

---

## Next: Phase 7

Add final demo enhancements: live session viewer, demo mode, metrics dashboard, one-click export.
