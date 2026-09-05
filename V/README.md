# VideoChat - Random Video Chat Application

A web-based video chat application similar to Monkey app with random 15-second timed video matching.

## Features

### MVP (Phase 1)
- User authentication (email/password)
- User profiles with age and gender
- Random 15-second video chat matching
- Mutual extend button (+15 seconds)
- Friend system after mutual match
- User reporting system
- Real-time WebRTC video streaming

### Phase 2 (Planned)
- Moments/Stories feature
- Video filters
- Premium subscription
- AI content moderation
- Interest-based matching

## Tech Stack

**Frontend:**
- Next.js 14 (React)
- TypeScript
- Tailwind CSS
- Zustand (state management)
- Socket.IO client
- WebRTC

**Backend:**
- Node.js + Express
- TypeScript
- Socket.IO
- Prisma ORM
- PostgreSQL
- Redis

## Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- npm or yarn

## Getting Started

### 1. Clone and Install

```bash
npm run install:all
```

### 2. Set up Environment Variables

**Backend:**
```bash
cd backend
cp .env.example .env
```

Edit `.env` with your database credentials and other settings.

**Frontend:**
```bash
cd frontend
cp .env.local.example .env.local
```

### 3. Set up Database

```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

### 4. Start Development Servers

From root directory:
```bash
npm run dev
```

This starts:
- Backend: http://localhost:3001
- Frontend: http://localhost:3000

Or start individually:
```bash
# Backend
cd backend && npm run dev

# Frontend
cd frontend && npm run dev
```

## Docker Setup

```bash
docker-compose up -d
```

This starts PostgreSQL, Redis, backend, and frontend containers.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Get profile (auth required)
- `PUT /api/auth/profile` - Update profile (auth required)

### WebSocket Events

**Client → Server:**
- `join_queue` - Join matching queue
- `leave_queue` - Leave matching queue
- `session_ready` - Signal session is ready
- `request_extend` - Request to extend session
- `end_session` - End current session
- `report_session` - Report a user
- `webrtc_signal` - WebRTC signaling data

**Server → Client:**
- `match_found` - Match found with another user
- `session_started` - Session started with timer
- `session_extended` - Both users agreed to extend
- `extend_requested` - Other user requested extend
- `session_ended` - Session ended
- `webrtc_signal` - WebRTC signaling data

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── config/        # Database, Redis, Logger
│   │   ├── controllers/   # Request handlers
│   │   ├── middleware/    # Auth, Error handling
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   └── index.ts       # Entry point
│   └── prisma/
│       └── schema.prisma  # Database schema
├── frontend/
│   ├── src/
│   │   ├── app/           # Next.js pages
│   │   ├── components/    # React components
│   │   ├── store/         # Zustand stores
│   │   └── lib/           # Utilities
│   └── public/
└── docker-compose.yml
```

## Development Timeline

- **Phase 1 (MVP)**: 12-16 weeks
- **Phase 2 (Growth)**: 8-12 weeks
- **Phase 3 (Scale)**: 8-10 weeks

## Compliance

- COPPA: 18+ age requirement
- GDPR: Data privacy compliance
- Age verification required
- Content moderation system

## License

MIT
