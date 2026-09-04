# random-videochat

Web-based random video chat (Monkey-like) with 15-second timed matches, mutual extend, moments (stories), premium, and moderation/ML moderation.

## Repository layout

- `apps/web/`: Next.js (TypeScript) web app
- `services/api/`: Go HTTP API (REST) for auth/profiles/moments/subscriptions/moderation
- `services/match/`: Go WebSocket service for matchmaking + call session signaling
- `infra/`: local dev infrastructure (Postgres/Redis) and configuration
- `docs/`: product + technical specs (MVP/Phase 2), schema, vendors, compliance, timelines

## Quickstart (local dev)

This repo is scaffolded to be runnable, but requires local installs:

- Node.js 20+
- Go 1.22+
- Docker Desktop

Steps (once dependencies are installed):

1. Start databases:
   - `docker compose -f infra/docker-compose.yml up -d`
2. Run API:
   - `cd services/api && go run ./cmd/api`
3. Run match service:
   - `cd services/match && go run ./cmd/match`
4. Run web:
   - `cd apps/web && npm install && npm run dev`

## Notes

- Video calls are assumed to use a managed WebRTC/SFU provider in MVP; this repo structures the app so the provider can be swapped later.

