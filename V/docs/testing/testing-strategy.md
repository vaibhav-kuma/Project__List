# Ninor Video Chat — Testing Strategy

## 1. Testing Philosophy

**Goal**: Deliver a reliable, secure, and performant video chat platform through comprehensive automated testing at every level.

**Principles**:
- Tests must be **deterministic** — same input always produces same output
- **Fast feedback** — unit tests < 1s, integration < 30s, E2E < 5min
- **Test behavior, not implementation** — refactor with confidence
- **Co-locate tests** — test files live alongside source code
- **Every PR must pass all gates** — lint → type-check → unit → integration → E2E → security

---

## 2. Test Pyramid

```
        ╱╲
       ╱  ╲          E2E (5-10 tests)
      ╱    ╲         ─────────────────
     ╱      ╲        Integration (30-50 tests)
    ╱────────╲       ─────────────────
   ╱          ╲      Unit (200+ tests)
  ╱────────────╲     ─────────────────
 ╱              ╲    Static Analysis (lint + type-check)
╱────────────────╲   ─────────────────
```

### Layer 1: Static Analysis
- **ESLint** — catch code quality issues, unused imports, anti-patterns
- **TypeScript** — catch type errors, null safety, invalid operations
- **Run on**: every push, pre-commit hook

### Layer 2: Unit Tests (Jest)
- **Scope**: Individual functions, components, hooks, services
- **Speed**: < 10ms per test
- **Isolation**: All external dependencies mocked
- **Coverage target**: 70%+ lines, 80%+ critical paths

### Layer 3: Integration Tests
- **Scope**: API endpoints with real DB + Redis
- **Speed**: < 500ms per test
- **Reality**: Tests interact with real PostgreSQL + Redis (test instances)
- **Coverage target**: All CRUD operations, auth flows, error paths

### Layer 4: E2E Tests (Cypress)
- **Scope**: Complete user journeys in browser
- **Speed**: < 10s per test
- **Reality**: Full stack deployed, real WebSocket, WebRTC mocked
- **Coverage target**: Critical user paths (auth, video chat, moderation)

---

## 3. Test Categories

### 3.1 Frontend Unit Tests

| Category | Framework | Location | Examples |
|----------|-----------|----------|----------|
| Components | Jest + RTL | `frontend/src/**/__tests__/` | VideoChat, LoginForm, MobileNav |
| Hooks | Jest + RTL | `frontend/src/hooks/__tests__/` | useWebRTCChat, usePWA, useAdminSocket |
| Stores | Jest | `frontend/src/store/__tests__/` | authStore, chatSocket, videoChatStore |
| Utils | Jest | `frontend/src/lib/__tests__/` | webrtcConfig, performance, pwa |

**Key test scenarios per component:**
- **VideoChat**: renders, matches, toggle camera/mic, session timer, extend, report, cancel queue
- **LoginForm**: validates email/password, shows errors, submits, loading state
- **MobileNav**: renders all tabs, active state, bottom navigation
- **SwipeHandler**: swipe gestures, pull-to-refresh, bottom sheet open/close
- **PWAProvider**: offline banner, install prompt, permission prompt

### 3.2 Backend Unit Tests

| Category | Framework | Location | Examples |
|----------|-----------|----------|----------|
| Services | Jest | `backend/src/services/__tests__/` | MatchingQueue, CacheService, AuthService |
| Middleware | Jest | `backend/src/middleware/__tests__/` | auth, admin, error, compliance |
| Utils | Jest | `backend/src/__tests__/` | validation, compression, metrics |
| Models | Jest | `backend/src/__tests__/` | schema validation, enum integrity |

**Key test scenarios per service:**
- **AuthService**: register, login, refresh token, verify email, 2FA setup
- **MatchingQueue**: add/remove from queue, compatibility scoring, premium priority, cooldowns
- **CacheService**: get/set, remember, TTL, del, delPattern, pipeline
- **AdminService**: dashboard stats, user management, analytics, ban/unban
- **Moderation**: flag content, process violation, auto-ban thresholds, appeal workflow

### 3.3 API Integration Tests

| Endpoint | Method | Test Scenarios | Auth |
|----------|--------|----------------|------|
| `/api/auth/register` | POST | Create user, duplicate email, invalid data, underage | No |
| `/api/auth/login` | POST | Valid credentials, wrong password, missing user, rate limit | No |
| `/api/auth/refresh` | POST | Valid token, expired token, invalid token | Yes |
| `/api/users/me` | GET | Current user, no token, bad token, banned user | Yes |
| `/api/users/me/preferences` | PATCH | Update prefs, partial update, invalid values | Yes |
| `/api/users/:id` | GET | User profile, non-existent user, privacy filtering | Optional |
| `/api/moments` | GET/POST | Create moment, list feed, pagination, expired moments | Yes |
| `/api/friends` | GET/POST/DELETE | Request friend, accept, list, remove, block | Yes |
| `/api/reports` | POST | Create report, duplicate, invalid reason, self-report | Yes |
| `/api/admin/dashboard` | GET | Stats, user count, session count, reports queue | Admin |

### 3.4 WebSocket Integration Tests

| Event | Direction | Test Scenarios |
|-------|-----------|----------------|
| `join_queue` | Client → Server | Join with prefs, join when already in queue |
| `leave_queue` | Client → Server | Leave queue, leave when not in queue |
| `match_found` | Server → Client | Both users get notification, session created |
| `webrtc_offer` | Peer → Peer | Offer relay, answer relay, ICE candidates |
| `session_timer` | Server → Client | 15s countdown, extend, session end |
| `extend_request` | Client → Server | Both users extend, one extends, max extends |

### 3.5 Security Tests

| Category | Tool | Scenarios |
|----------|------|-----------|
| SQL Injection | Custom | Login form injection, URL param injection, search injection |
| XSS | Custom | Display name injection, bio injection, moment caption |
| CSRF | Custom | Cross-origin requests, missing CSRF token |
| Rate Limiting | Artillery | Auth brute force, API abuse, WebSocket flood |
| Auth Bypass | Custom | JWT tampering, missing tokens, role escalation |
| Input Validation | Custom | Oversized payloads, malformed JSON, prototype pollution |
| Dependency Audit | npm audit, Snyk | Known vulnerabilities, outdated packages |
| Container Scan | Trivy | Docker image vulnerabilities, misconfigurations |

### 3.6 Performance Tests

| Test Type | Tool | Targets |
|-----------|------|---------|
| Load | k6, Artillery | 1000 concurrent WebSocket connections, 500 req/s API |
| Stress | k6 | Ramp to 5000 concurrent users, measure breaking point |
| Soak | k6 | Sustained 500 users for 1 hour, monitor memory leaks |
| Spike | k6 | Sudden 10x traffic increase, verify recovery |
| Endurance | k6 | 24-hour run with 100 users, check for degradation |
| WebRTC | Custom | 500 concurrent peer connections, measure latency |
| Database | pgbench | Query throughput under load, connection pool limits |

---

## 4. Test Infrastructure Setup

### 4.1 Required Dependencies

```bash
# Backend
cd backend
npm install --save-dev jest ts-jest @types/jest supertest @types/supertest

# Frontend
cd frontend
npm install --save-dev jest @testing-library/react @testing-library/jest-dom \
  @testing-library/user-event jest-environment-jsdom @types/jest babel-jest \
  identity-obj-proxy

# Root
npm install --save-dev cypress @cypress/code-coverage

# Security
npm install --save-dev snyk
```

### 4.2 Configuration Files

| File | Purpose |
|------|---------|
| `backend/jest.config.js` | Backend Jest config (ts-jest, node env, coverage) |
| `frontend/jest.config.ts` | Frontend Jest config (next/jest, jsdom, RTL) |
| `cypress.config.ts` | Cypress E2E config (baseUrl, viewport, retries) |
| `backend/tsconfig.json` | Include Jest types via `types: ["jest"]` |
| `.env.test` | Test environment variables (separate DB, Redis) |
| `.github/workflows/ci-cd.yml` | Full CI/CD pipeline |

### 4.3 Test Scripts

Add to root `package.json`:
```json
{
  "scripts": {
    "test": "npm run test:backend && npm run test:frontend",
    "test:backend": "cd backend && npm test",
    "test:frontend": "cd frontend && npm test",
    "test:integration": "cd backend && npm run test:integration",
    "test:e2e": "cypress run",
    "test:e2e:open": "cypress open",
    "test:coverage": "npm run test:backend -- --coverage && npm run test:frontend -- --coverage",
    "test:security": "npm audit && snyk test",
    "test:watch": "cd backend && npm run test:watch",
    "test:ci": "npm run test:coverage && npm run test:integration && npm run test:e2e"
  }
}
```

Add to `backend/package.json`:
```json
{
  "scripts": {
    "test": "jest --passWithNoTests",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:integration": "jest --testPathPattern='integration'",
    "test:unit": "jest --testPathPattern='src/__tests__/(?!integration)'"
  }
}
```

Add to `frontend/package.json`:
```json
{
  "scripts": {
    "test": "jest --passWithNoTests",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

---

## 5. File Organization

```
backend/
├── src/
│   ├── __tests__/
│   │   ├── helpers.ts                    # Test factories, mocks
│   │   ├── setup.ts                      # Env setup
│   │   ├── globalSetup.ts                # DB + Redis setup
│   │   ├── globalTeardown.ts             # Cleanup
│   │   ├── validation.test.ts
│   │   ├── authMiddleware.test.ts
│   │   ├── adminMiddleware.test.ts
│   │   ├── cacheService.test.ts
│   │   ├── errorMiddleware.test.ts
│   │   ├── matchingAlgorithm.test.ts
│   │   └── integration/
│   │       ├── setup.ts                  # Test server setup
│   │       └── api.test.ts               # API flow tests
│   ├── services/
│   │   └── __tests__/
│   │       ├── matchingQueue.test.ts      # Existing
│   │       └── automatedActionEngine.test.ts  # Existing
│   └── middleware/
│       └── __tests__/
│           ├── compliance.test.ts
│           └── rateLimit.test.ts

frontend/
├── src/
│   ├── __tests__/
│   │   ├── jest.setup.ts                 # RTL imports
│   │   └── fileMock.ts                   # Static file mock
│   ├── __mocks__/                         # Manual mocks
│   ├── components/
│   │   └── __tests__/
│   │       ├── VideoChat.test.tsx
│   │       ├── LoginForm.test.tsx
│   │       ├── MobileNav.test.tsx
│   │       └── SwipeHandler.test.tsx
│   ├── hooks/
│   │   └── __tests__/
│   │       ├── useWebRTCChat.test.ts
│   │       ├── usePWA.test.ts
│   │       └── useAdminSocket.test.ts
│   ├── lib/
│   │   └── __tests__/
│   │       ├── webrtcConfig.test.ts
│   │       ├── performance.test.ts
│   │       └── pwa.test.ts
│   └── store/
│       └── __tests__/
│           ├── authStore.test.ts
│           └── videoChatStore.test.ts

cypress/
├── e2e/
│   ├── auth.cy.ts                        # Login/register flows
│   ├── videoChat.cy.ts                   # Video chat flows
│   ├── moments.cy.ts                     # Moments/social flows
│   ├── moderation.cy.ts                  # Moderation flows
│   └── admin.cy.ts                       # Admin dashboard flows
├── support/
│   ├── commands.ts                       # Custom Cypress commands
│   └── e2e.ts                            # Global imports
├── fixtures/
│   └── users.json                        # Test user data
└── downloads/                            # Download artifacts
```

---

## 6. Mock Strategy

### 6.1 Backend Mocks

| Dependency | Mock Strategy | Tool |
|-----------|---------------|------|
| Prisma (DB) | Module-level `jest.mock()` for unit tests; real DB for integration | jest.mock |
| Redis | Module-level `jest.mock()` for unit tests; real Redis for integration | jest.mock |
| JWT | Mock `jwt.verify` return value | jest.mock('jsonwebtoken') |
| Email | Mock `send` method, verify called with correct args | jest.mock |
| Stripe | Mock webhook parsing, payment intent creation | jest.mock('stripe') |
| AWS S3 | Mock `putObject`, `getSignedUrl` | jest.mock |
| Socket.IO | Mock `io.emit`, `socket.emit` | Manual mock |
| TensorFlow | Mock prediction return value | jest.mock |

### 6.2 Frontend Mocks

| Dependency | Mock Strategy | Tool |
|-----------|---------------|------|
| Next.js Router | `jest.mock('next/navigation')` | jest.mock |
| Socket.IO Client | Mock `io()` return value with `emit`, `on`, `off` | jest.mock('socket.io-client') |
| MediaDevices | Mock `getUserMedia`, `enumerateDevices` | jest.spyOn |
| WebRTC | Mock `RTCPeerConnection`, `RTCSessionDescription` | jest.spyOn |
| Service Worker | Mock `register`, `pushManager.subscribe` | jest.spyOn |
| Zustand Stores | Use actual stores, mock network calls | Dependency injection |
| window.fetch | Mock with mock response | jest.spyOn |
| Performance API | Mock `PerformanceObserver` | jest.spyOn |

### 6.3 Test Factories

All test factories are in `backend/src/__tests__/helpers.ts`:
- `createMockUser(overrides)` — full user object
- `createMockSession(overrides)` — video session
- `createMockReport(overrides)` — moderation report
- `createMockMatch(overrides)` — match history
- `createMockMoment(overrides)` — social moment
- `createMockRequest(overrides)` — Express request
- `createMockResponse()` — Express response (jest.fn chain)
- `createMockSocket(overrides)` — Socket.IO socket
- `createMockRedis()` — Redis client mock

---

## 7. Coverage Targets

### Phase 1 (Current Sprint)
- Backend services: 75% line coverage
- Backend middleware: 85% line coverage
- Backend validation: 90% line coverage
- Frontend core components: 60% line coverage
- Frontend hooks: 70% line coverage

### Phase 2 (Next Sprint)
- Backend services: 85% line coverage
- Backend controllers: 70% line coverage
- Frontend components: 75% line coverage
- Frontend stores: 80% line coverage

### Phase 3 (Release)
- Global: 80% line coverage
- Critical paths: 95%+ line coverage
- E2E: 20 critical user journeys

---

## 8. CI/CD Pipeline Stages

```
Push → Lint → TypeCheck → Unit Tests → Security Scan
                                          ↓
                                    Build Docker
                                          ↓
                                    Deploy Staging
                                          ↓
                                    Integration Tests
                                          ↓
                                    E2E Tests (Cypress)
                                          ↓
                                    Performance Tests
                                          ↓
                                    Deploy Production
                                          ↓
                                    Smoke Tests (5 min)
                                          ↓
                                    Health Monitoring
```

**Pipeline details** (see `.github/workflows/ci-cd.yml`):
- Parallel: lint + type-check (3min)
- Parallel: unit tests backend + frontend (4min)
- Sequential: security scan (2min)
- Sequential: build Docker (3min)
- Sequential: deploy staging (2min)
- Sequential: integration + E2E (8min)
- Sequential: performance tests (5min)
- Sequential: deploy production (2min)

**Total CI time**: ~25-30 minutes

---

## 9. Flaky Test Prevention

### Root Causes
- **Timing**: Async operations not awaited, setTimeout assumptions
- **Ordering**: Test relies on specific execution order
- **Shared state**: Tests modify global/database state
- **Network**: External API flakiness, rate limiting
- **Date/time**: Tests that depend on current time

### Prevention Strategies
1. **Always await** — every async operation must be awaited
2. **Isolated state** — clean DB/Redis between tests
3. **Deterministic time** — use `jest.useFakeTimers()` for time-dependent tests
4. **Retry flaky tests** — Cypress auto-retries, Jest `--retry` flag
5. **No network in unit tests** — mock all external calls
6. **Cleanup in `afterEach`** — remove test data, close connections
7. **Idempotent setup** — `beforeEach` should work if run multiple times

### Quarantine Process
1. Mark flaky test with `test.skip` and create GitHub issue
2. Investigate root cause within 2 days
3. Fix and re-enable test
4. Add regression test for the fix

---

## 10. Testing Checklist

### Pre-Merge Checklist
- [ ] All TypeScript files compile (0 errors)
- [ ] ESLint passes (0 warnings)
- [ ] All unit tests pass (backend + frontend)
- [ ] All integration tests pass
- [ ] New code has ≥70% coverage
- [ ] No `.only` or `.skip` left in test files
- [ ] No `console.log` in production code

### Pre-Release Checklist
- [ ] E2E tests pass on Chrome, Firefox, Safari
- [ ] Mobile testing completed (iOS + Android)
- [ ] Accessibility audit passes (WCAG AA)
- [ ] Security scan passes (0 critical, 0 high)
- [ ] Load test within thresholds (< 1s p95 API latency)
- [ ] Database migrations tested on staging
- [ ] Rollback plan documented

### Smoke Tests (Post-Deploy)
- [ ] Health endpoint returns 200
- [ ] User can register and login
- [ ] User can start a video chat
- [ ] Report flow works end-to-end
- [ ] Admin dashboard loads
- [ ] Static assets served from CDN
- [ ] WebSocket connections establish

---

## 11. Performance Budget

| Metric | Threshold | Test |
|--------|-----------|------|
| Bundle size (JS) | < 200 KB initial | `npm run analyze` |
| LCP | < 2.5s | Lighthouse CI |
| FID | < 100ms | Lighthouse CI |
| CLS | < 0.1 | Lighthouse CI |
| API p95 latency | < 200ms | k6 |
| WebSocket latency (p95) | < 50ms | Custom |
| Auth response | < 500ms | k6 |
| Match time (p95) | < 3s | Custom |
| DB query (p95) | < 50ms | pg_stat_statements |
| Cache hit rate | > 80% | Redis metrics |
| Error rate | < 0.1% | Sentry |
| Concurrent users | > 1,000 | Load test |

---

## 12. Environment Configuration

### `.env.test`
```env
NODE_ENV=test
DATABASE_URL=postgresql://ninor:test@localhost:5432/ninor_test
REDIS_URL=redis://localhost:6379/1
JWT_SECRET=test-jwt-secret-do-not-use-in-production
FRONTEND_URL=http://localhost:3000
PORT=0
```

### Test Database
```bash
# Create test database
createdb ninor_test
# Run migrations
npx prisma migrate deploy
# Seed test data
npx ts-node src/scripts/seedTestData.ts
```

---

## 13. Running Tests

```bash
# Backend
cd backend
npm test                          # All unit tests
npm run test:watch                # Watch mode for TDD
npm run test:coverage             # With coverage report
npm run test:integration          # Integration tests only
npm run test -- --testPathPattern='matching'  # Specific file pattern

# Frontend
cd frontend
npm test                          # All tests
npm run test:watch                # Interactive watch mode
npm run test:coverage             # With coverage report

# E2E (from root)
npm run test:e2e                  # Headless Cypress
npm run test:e2e:open             # Cypress GUI

# All tests
npm test                          # Backend + Frontend
npm run test:ci                   # Full CI suite

# Security
npm audit                         # Dependency audit
npx snyk test                     # Snyk vulnerability scan

# Performance
k6 run docs/deployment/load-testing/webrtc-signaling.js
artillery run docs/deployment/load-testing/api.yml
```

---

## 14. Debugging Tests

### Jest Debug Commands
```bash
# Print test names only
npx jest --verbose --listTests

# Run single test file
npx jest src/__tests__/authMiddleware.test.ts

# Run tests matching name
npx jest --testNamePattern="should reject banned"

# Debug with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand

# Show full error output
npx jest --noStackTrace=false
```

### Cypress Debug Commands
```bash
# Open Cypress GUI
npx cypress open

# Run single spec
npx cypress run --spec "cypress/e2e/auth.cy.ts"

# Run with Chrome
npx cypress run --browser chrome

# Record video
npx cypress run --video true

# Debug mode
DEBUG=cypress:* npx cypress run
```

---

## 15. Continuous Improvement

- **Weekly**: Review flaky tests, update quarantined tests
- **Sprint**: Add tests for new features during development (not after)
- **Release**: Full regression suite + performance baseline comparison
- **Monthly**: Audit coverage gaps, update test strategy document
- **Quarterly**: Penetration test by security team
