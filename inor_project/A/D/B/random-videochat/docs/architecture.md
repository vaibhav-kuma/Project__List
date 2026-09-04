# Architecture (Next.js + Go + Postgres + Redis)

## Baseline stack (selected)

- **Web app**: Next.js (TypeScript) in `apps/web`
- **API service**: Go HTTP API in `services/api`
- **Match/signaling service**: Go WebSocket service in `services/match`
- **Database**: PostgreSQL
- **Cache/queue**: Redis
- **Object storage**: S3-compatible (AWS S3 in prod; local/minio optional later)
- **Video**: managed WebRTC/SFU provider (MVP) with provider tokens issued by API

## Service responsibilities

### `apps/web` (Next.js)

- Auth UI, age gate UI, profile UI
- Matching UI (queue, match screen, timer, extend)
- WebRTC UI (provider SDK/WebRTC abstraction)
- Moments UI (upload, feed view)
- Reporting UI (in-call report + block)
- Minimal admin UI can be separate later; MVP can be a separate `apps/admin` if needed

### `services/api` (Go)

- Auth (OTP verification integration), sessions/tokens
- Profiles CRUD
- Moments CRUD and feed reads
- Subscriptions + entitlements (Phase 2)
- Reporting endpoints + moderation actions (admin-only)
- Evidence metadata storage (asset URLs, retention)
- Provider token minting for video sessions (JWT/token creation)

### `services/match` (Go)

- WebSocket connections for presence + queueing
- Matchmaking algorithm (random + constraints)
- Timer/extend coordination (authoritative server timer)
- Signaling messages (not WebRTC SDP if using managed provider; instead “session ready”, “extend intent”, “end”)
- Rate limiting & abuse controls at realtime layer

## Data flows (MVP)

### 1) Start matching

1. Client authenticates with API and opens WebSocket to match service with a session token.
2. Client sends `queue.join` with preferences (none in MVP).
3. Match service pairs two queued users → creates `match_id` and asks API to create a `call_session` and mint provider tokens.
4. Match service sends `match.found` to both clients with `match_id` + provider join credentials.

### 2) Call + 15s timer + extend

1. Clients join provider room.
2. When both clients signal `call.connected`, match service starts an authoritative **15s countdown** and broadcasts `timer.tick`.
3. Each client can send `extend.request`.
4. If both have requested within window, match service broadcasts `extend.accepted` and updates match duration state.
5. If timer expires without mutual extend, match service sends `match.end` and both clients leave the call.

### 3) Reporting

1. Client submits `report.create` to API with `match_id`, category, and optional note (and may also send `match.end`).
2. API writes report + links to session.
3. API optionally triggers evidence capture workflow (provider recording/snapshot hooks) if configured.

## Deployment (recommended path)

- **MVP**: single-region deployment
  - `services/api` and `services/match` on container runtime (ECS/Fargate or Kubernetes later)
  - Postgres managed (RDS)
  - Redis managed (Elasticache)
  - CDN (CloudFront) for `apps/web` static assets
- **Phase 2**: multi-region
  - region-aware routing + EU data residency strategy
  - read replicas and partitioning for high-volume tables (matches/events)

## Key security and safety defaults

- Short-lived tokens for match WebSocket and provider join tokens
- Strict rate limits on auth, queue join, report submit, and upload endpoints
- Blocklists enforced at match service before pairing
- Full audit log for moderation actions

