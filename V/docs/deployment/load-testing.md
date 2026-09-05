# Load Testing Scenarios for Ninor Video Chat

## 1. Setup

```bash
# Install artillery globally
npm install -g artillery @artilleryio/artillery

# Install k6
# Windows: choco install k6
# macOS: brew install k6
# Linux: apt install k6
```

## 2. WebSocket Connection Test (Artillery)

```yaml
# tests/load/websocket.yml
config:
  target: "http://localhost:3001"
  phases:
    - duration: 60
      arrivalRate: 10
      rampTo: 50
      name: "Ramp up connections"
    - duration: 120
      arrivalRate: 50
      name: "Sustained load"
    - duration: 60
      arrivalRate:
        - { from: 50, to: 100 }
      name: "Peak load"
  defaults:
    headers:
      Authorization: "Bearer {{ token }}"
  variables:
    tokens:
      - "test_token_1"
      - "test_token_2"
      - "test_token_3"

scenarios:
  - name: "Connect and match"
    engine: "socketio"
    flow:
      - emit:
          channel: "join_queue"
          data:
            preferences:
              genderPreference: "any"
              ageRange: [18, 35]
      - think: 5
      - emit:
          channel: "leave_queue"
      - loop:
          - emit:
              channel: "friend_request"
              data:
                to: "user-{{ $randomString(8) }}"
          - think: 3
        count: 5
      - emit:
          channel: "update_status"
          data:
            status: "offline"
```

## 3. REST API Load Test (Artillery)

```yaml
# tests/load/api.yml
config:
  target: "http://localhost:3001"
  phases:
    - duration: 30
      arrivalRate: 5
      rampTo: 30
      name: "Warm up"
    - duration: 60
      arrivalRate: 30
      rampTo: 100
      name: "Stress test"
    - duration: 120
      arrivalRate: 100
      name: "Sustained peak"
  defaults:
    headers:
      Content-Type: "application/json"

scenarios:
  - name: "Auth flow"
    flow:
      - post:
          url: "/api/auth/register"
          json:
            email: "{{ $randomEmail() }}"
            password: "TestPass123!"
            displayName: "TestUser_{{ $randomString(5) }}"
            age: "{{ $randomNumber(18,60) }}"
            gender: "male"
          capture:
            - json: "$.token"
              as: "token"
      - patch:
          url: "/api/users/preferences"
          headers:
            Authorization: "Bearer {{ token }}"
          json:
            ageRangeMin: 18
            ageRangeMax: 45
            preferredGenders: ["female"]
      - get:
          url: "/api/users/me"
          headers:
            Authorization: "Bearer {{ token }}"
      - get:
          url: "/api/moments?limit=10"
          headers:
            Authorization: "Bearer {{ token }}"

  - name: "Report flow"
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "user-{{ $randomNumber(1,100) }}@test.com"
            password: "TestPass123!"
          capture:
            - json: "$.token"
              as: "token"
      - get:
          url: "/api/users/me"
          headers:
            Authorization: "Bearer {{ token }}"
      - post:
          url: "/api/reports"
          headers:
            Authorization: "Bearer {{ token }}"
          json:
            reportedUserId: "{{ $randomString(36) }}"
            reason: "harassment"
            description: "Test report for load testing"

  - name: "Admin dashboard"
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "admin@ninor.app"
            password: "AdminPass123!"
          capture:
            - json: "$.token"
              as: "token"
      - get:
          url: "/api/admin/dashboard"
          headers:
            Authorization: "Bearer {{ token }}"
      - get:
          url: "/api/admin/users?limit=50"
          headers:
            Authorization: "Bearer {{ token }}"
      - get:
          url: "/api/admin/analytics"
          headers:
            Authorization: "Bearer {{ token }}"
```

## 4. WebRTC Signaling Load (k6)

```javascript
// tests/load/webrtc-signaling.js
import { WebSocket } from 'k6/ws';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 200 },
    { duration: '2m', target: 500 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    ws_connecting: ['p(95)<500'],
    ws_ms: ['p(95)<200'],
    ws_sessions: ['value>100'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'ws://localhost:3001';
const TOKEN = __ENV.TOKEN || 'test-token';

export default function () {
  const url = `${BASE_URL}/socket.io/?EIO=4&transport=websocket&token=${TOKEN}`;
  const res = WebSocket.connect(url, {}, function (socket) {
    socket.on('open', () => {
      socket.send('40{"token":"' + TOKEN + '"}');
      sleep(0.5);

      // Join match queue
      socket.send(JSON.stringify({
        event: 'join_queue',
        data: { preferences: { ageRange: [18, 35] } }
      }));

      // Simulate signaling
      socket.on('message', (data) => {
        if (data.includes('match_found')) {
          socket.send(JSON.stringify({
            event: 'webrtc_offer',
            data: { sdp: 'test_sdp_offer', type: 'offer' }
          }));
        }
        if (data.includes('webrtc_answer')) {
          socket.send(JSON.stringify({
            event: 'ice_candidate',
            data: { candidate: 'test_ice_candidate' }
          }));
        }
      });

      sleep(30);
      socket.close();
    });

    socket.on('error', (e) => {
      console.error('WebSocket error:', e);
    });
  });

  check(res, { 'status is 101': (r) => r && r.status === 101 });
}
```

## 5. Database Load Test

```sql
-- tests/load/database-queries.sql
-- Simulate concurrent matching queries
SELECT * FROM users 
WHERE status = 'online' 
  AND is_banned = false 
  AND age BETWEEN 18 AND 35
ORDER BY last_active_at DESC 
LIMIT 50;

-- Simulate moment feed queries
SELECT m.*, u.display_name, u.avatar_url
FROM moments m
JOIN users u ON u.id = m.user_id
WHERE m.is_expired = false 
  AND m.moderation_status = 'approved'
  AND (m.visibility = 'public' OR 
       m.user_id IN (SELECT user2_id FROM friends WHERE user1_id = 'test-user-id' AND status = 'accepted'))
ORDER BY m.created_at DESC
LIMIT 20;

-- Simulate match history queries
SELECT * FROM match_history
WHERE user_id = 'test-user-id'
ORDER BY matched_at DESC
LIMIT 50;

-- Concurrent session creation simulation
BEGIN;
INSERT INTO video_sessions (id, user1_id, user2_id, status)
VALUES (gen_random_uuid(), 'user1', 'user2', 'active');
COMMIT;

-- Update user status (high frequency)
UPDATE users SET status = 'online', last_active_at = NOW()
WHERE id = 'test-user-id';
```

## 6. Running Load Tests

```bash
# Run WebSocket load test
artillery run tests/load/websocket.yml --output tests/load/websocket-report.json
artillery report tests/load/websocket-report.json

# Run API load test
artillery run tests/load/api.yml --output tests/load/api-report.json
artillery report tests/load/api-report.json

# Run k6 WebRTC test
k6 run tests/load/webrtc-signaling.js --vus 100 --duration 60s

# Monitor during tests (separate terminal)
curl http://localhost:3001/metrics | grep -E "http_requests|active_connections|match_queue"
```

## 7. Test Results Analysis

### Key Metrics to Track

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Concurrent WebSocket | 10,000 | 5,000 | 15,000 |
| API RPS | 500 | 300 | 800 |
| Match Queue Latency | < 500ms | > 1s | > 3s |
| DB Query Time (p95) | < 50ms | > 100ms | > 500ms |
| Cache Hit Rate | > 80% | > 60% | < 40% |
| Error Rate | < 0.1% | > 1% | > 5% |
| CPU Usage | < 60% | > 80% | > 90% |
| Memory Usage | < 500MB | > 1GB | > 2GB |

### Interpreting Results

```
# High WebSocket latency (>200ms)
- Check Redis performance
- Increase Socket.IO ping interval
- Add more backend instances

# High API response time (>500ms)
- Check database query performance
- Verify cache hit rate
- Look for N+1 queries

# Low cache hit rate (<60%)
- Review caching strategy
- Check cache invalidation patterns
- Increase TTL where appropriate

# High error rate (>1%)
- Check Sentry for error patterns
- Verify database connection pool size
- Review rate limiting configuration
```

## 8. Performance Baseline

```bash
# Capture baseline before optimization
curl http://localhost:3001/metrics > baseline-metrics.txt
# Run load test
artillery run tests/load/api.yml
curl http://localhost:3001/metrics > after-optimization-metrics.txt

# Compare
diff baseline-metrics.txt after-optimization-metrics.txt
```

## 9. Expected Improvements

| Optimization | Expected Gain |
|-------------|---------------|
| Redis caching | 40-60% reduction in API latency |
| Compression (Brotli) | 60-70% reduction in payload size |
| CDN caching | 80-90% reduction in static asset load |
| Connection pooling | 2-3x more concurrent DB connections |
| Adaptive bitrate | 30-50% reduction in bandwidth usage |
| Code splitting | 30-50% reduction in initial JS bundle |
| Image optimization | 60-80% reduction in image weight |
| Service worker caching | Instant loads for repeat visits |
