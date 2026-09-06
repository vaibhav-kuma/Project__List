# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Setup & Development
- Install all dependencies: `npm run install:all`
- Start both backend and frontend: `npm run dev`
- Start backend only: `cd backend && npm run dev`
- Start frontend only: `cd frontend && npm run dev`
- Build both: `npm run build`
- Project setup script: `npm run setup`

### Testing & Quality
- Run all tests: `npm run test`
- Backend tests: `npm run test:backend`
- Frontend tests: `npm run test:frontend`
- Integration tests: `npm run test:integration`
- E2E tests: `npm run test:e2e` (UI: `npm run test:e2e:open`)
- Type check: `npm run typecheck`
- Lint frontend: `npm run lint`
- Lint backend: `npm run lint:backend`
- Format code: `npm run format`

### Database (Backend)
- Migrate database: `cd backend && npx prisma migrate dev`
- Generate Prisma client: `cd backend && npx prisma generate`

## Architecture & Structure

### High-Level Overview
The project is a random video chat application with a decoupled frontend and backend.

- **Frontend**: Next.js 14 (React) using App Router, Tailwind CSS for styling, Zustand for state management, and Socket.IO/WebRTC for real-time video communication.
- **Backend**: Node.js with Express, TypeScript, Socket.IO for real-time signaling/matching, Prisma ORM with PostgreSQL for persistence, and Redis for session/queue management.

### Project Structure
- `backend/`:
  - `src/config/`: Database, Redis, and logger configurations.
  - `src/controllers/`: Express request handlers.
  - `src/middleware/`: Authentication and error handling.
  - `src/routes/`: API route definitions.
  - `src/services/`: Core business logic and domain services.
  - `prisma/`: Database schema and migrations.
- `frontend/`:
  - `src/app/`: Next.js pages and layouts.
  - `src/components/`: Reusable React UI components.
  - `src/store/`: Zustand stores for global state.
  - `src/lib/`: Utility functions and shared libraries.
- `docker-compose.yml`: Orchestrates PostgreSQL, Redis, and the application services.
