# Ninor Video Chat (MVP scaffold)

This repo scaffolds an MVP "Monkey-like" random video chat:

- Random **15-second** video matching
- **Extend** only if both users agree
- Basic **profiles** (age + gender)

## Prereqs

- Node.js 20+
- Docker Desktop (for Postgres + Redis)

## Run locally

1) Copy env

```bash
copy .env.example .env
```

2) Start databases

```bash
docker compose up -d
```

3) Install deps

```bash
npm install
```

4) Generate Prisma client + migrate

```bash
npm run prisma:generate
npm run db:migrate
```

5) Start API + Web

```bash
npm run dev
```

- Web: `http://localhost:3000`
- API: `http://localhost:4000/health`

## Notes

- WebRTC here is **peer-to-peer** with basic signaling via Socket.IO. For production scale, swap to a managed WebRTC provider or add an SFU + TURN.
- Moderation, moments, premium, and ML moderation are intentionally not implemented in this MVP scaffold yet (next phases).

