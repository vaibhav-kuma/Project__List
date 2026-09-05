# Contributing to Ninor Video Chat

## Quick Start

```bash
# Clone & install
git clone https://github.com/your-org/ninor.git
cd ninor
npm run install:all

# Set up environment
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local

# Set up database
cd backend
npx prisma generate
npx prisma migrate dev
npm run seed:subscription

# Start development
npm run dev
```

## Development Setup

### Prerequisites
- **Node.js** 20.x (use [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm))
- **PostgreSQL** 16+
- **Redis** 7+
- **Docker** (optional, for containerized setup)

### Docker Quick Start
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Environment Variables
| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `JWT_SECRET` | Yes | JWT signing secret (32+ chars) |
| `SENTRY_DSN` | No | Sentry error tracking DSN |
| `STRIPE_SECRET_KEY` | No | Stripe payments secret |
| `AWS_ACCESS_KEY_ID` | No | S3 uploads access key |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | No | Push notification VAPID key |

## Code Standards

### TypeScript
- **Strict mode** enabled — no `any` unless absolutely necessary
- Use `interface` over `type` for object shapes
- Use `enum` only for string enums; prefer union types
- Async functions should return proper types, not `Promise<any>`

### Naming Conventions
| Category | Convention | Example |
|----------|-----------|---------|
| Components | PascalCase | `VideoChat.tsx` |
| Hooks | camelCase, prefixed with `use` | `useWebRTCChat.ts` |
| Services | camelCase | `matchingService.ts` |
| Middleware | camelCase | `authMiddleware.ts` |
| Routes | camelCase | `authRoutes.ts` |
| Stores | camelCase | `authStore.ts` |
| Test files | Same as source + `.test.ts` | `authMiddleware.test.ts` |

### File Organization
```
src/
├── app/          # Next.js App Router pages
├── components/   # Reusable React components
├── hooks/        # Custom React hooks
├── lib/          # Utilities and libraries
├── store/        # Zustand state stores
└── __tests__/    # Test files
```

### CSS/Styling
- Use **Tailwind CSS** utility classes
- No CSS modules or styled-components
- Custom styles go in `globals.css` using `@apply`

### State Management
- **Zustand** for global state (auth, chat, WebSocket)
- **React state** for local component state
- **URL params** for page-level state (filters, pagination)
- No Redux, no Context API for data

## Git Workflow

### Branch Naming
```
feat/description-of-feature
fix/description-of-fix
hotfix/description-of-hotfix
security/description-of-vulnerability
refactor/description-of-refactor
```

### Commit Convention
We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types**: `feat`, `fix`, `hotfix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`, `security`

**Scopes** (optional): `auth`, `api`, `web`, `mobile`, `video`, `matching`, `moderation`, `admin`, `payment`, `compliance`, `safety`, `monitoring`, `infra`, `deps`, `config`

**Examples:**
```
feat(auth): add Google OAuth login
fix(video): resolve WebRTC connection timeout
perf(api): add Redis caching for user profiles
security(auth): prevent JWT token injection
docs(api): update WebSocket event documentation
```

### PR Process
1. Create a feature branch from `main`
2. Make changes with descriptive commits
3. Run `npm test` and ensure all pass
4. Create a PR against `main`
5. Ensure CI pipeline passes
6. Get at least one review approval
7. Squash-merge into `main`

## Testing

### Running Tests
```bash
# All tests
npm test

# Specific test types
npm run test:backend        # Backend unit tests
npm run test:frontend       # Frontend component tests
npm run test:integration    # API integration tests
npm run test:e2e            # E2E tests (Cypress)
npm run test:coverage       # With coverage report
```

### Writing Tests
- **Unit tests**: Mock all dependencies, test one thing
- **Integration tests**: Use real DB + Redis (test instances)
- **E2E tests**: Test complete user journeys in browser
- **Security tests**: Test injection, XSS, CSRF, auth bypass

See [docs/testing/testing-strategy.md](docs/testing/testing-strategy.md) for complete details.

## Architecture

```
Frontend (Next.js 14)
  │
  ├── Pages (App Router)
  ├── Components (React)
  ├── Store (Zustand)
  └── Hooks (Custom)
        │
        │ HTTP/REST + WebSocket
        ▼
Backend (Express + Socket.IO)
  │
  ├── Controllers (Request handlers)
  ├── Services (Business logic)
  ├── Middleware (Auth, validation)
  └── Routes (URL routing)
        │
        ▼
Infrastructure
  ├── PostgreSQL (Primary DB)
  ├── Redis (Cache + Queue)
  ├── S3 (File storage)
  └── TURN (WebRTC relay)
```

See [docs/architecture/](docs/architecture/) for detailed architecture documentation.

## Need Help?

- Check existing [issues](https://github.com/your-org/ninor/issues)
- Read [docs/](docs/) for detailed documentation
- Ask in the project's communication channel
