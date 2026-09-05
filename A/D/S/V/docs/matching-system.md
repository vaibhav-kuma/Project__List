# Intelligent Matching System - Complete Implementation

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Matching System                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    Redis (In-Memory)                          │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │  Sorted Set: match:queue          ← Global queue (score=time) │   │
│  │  Sorted Set: match:region:{id}    ← Regional queues           │   │
│  │  Hash: match:user:{id}            ← User data + preferences   │   │
│  │  String: match:cooldown:{a}:{b}   ← Cooldown tracking         │   │
│  │  String: match:position:{id}      ← Queue position cache      │   │
│  │  Sorted Set: match:active:sessions ← Active session tracking  │   │
│  │  Hash: match:stats:{date}         ← Daily statistics          │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              ↑↓                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              MatchingQueue Service                            │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │  • addToQueue()     - Add user with preferences              │   │
│  │  • removeFromQueue() - Remove user                           │   │
│  │  • processMatches()  - Match loop (500ms interval)           │   │
│  │  • calculateCompatibility() - Scoring algorithm              │   │
│  │  • createMatch()     - Create session + notify               │   │
│  │  • handleLongWaitUsers() - Relax preferences                 │   │
│  │  • cleanupStaleUsers() - Remove abandoned queues             │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              ↑↓                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              Socket.IO Server                                 │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │  Events:                                                     │   │
│  │  → join_queue        ← Add to matching queue                 │   │
│  │  → leave_queue       ← Remove from queue                     │   │
│  │  → session_ready     ← Confirm WebRTC ready                  │   │
│  │  → webrtc_signal     ← Relay signaling data                  │   │
│  │  → request_extend    ← Request session extension             │   │
│  │  → end_session       ← End current session                   │   │
│  │  → get_queue_stats   ← Get queue statistics                  │   │
│  │                                                              │   │
│  │  ← queue_joined      ← Position + estimated wait             │   │
│  │  ← queue_position_update ← Live position updates (3s)        │   │
│  │  ← queue_left        ← Confirmation                          │   │
│  │  ← match_found       ← Match notification                    │   │
│  │  ← session_started   ← Session begin + timer                 │   │
│  │  ← session_extended  ← Both agreed to extend                 │   │
│  │  ← extend_requested  ← Other user wants extend               │   │
│  │  ← session_ended     ← Session complete                      │   │
│  │  ← webrtc_signal     ← Relay signaling data                  │   │
│  │  ← queue_stats       ← Queue statistics                      │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              ↑↓                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              PostgreSQL (Persistent)                          │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │  • video_sessions    - Session records                       │   │
│  │  • match_history     - Match tracking + cooldowns            │   │
│  │  • users             - User profiles + stats                 │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Matching Algorithm

### Compatibility Scoring

| Factor | Weight | Description |
|--------|--------|-------------|
| Base Score | 50 | Starting point for all matches |
| Same Region | +50 | Users in same geographic region |
| Common Language | +30 per language | Shared language preferences |
| Both Premium | +20 | Premium users matched together |
| Wait Time Bonus | +2 per 10s (max 20) | Incentivizes matching after long waits |
| **Maximum** | **100** | Cap on compatibility score |

### Matching Threshold

- **Score ≥ 50**: Match created immediately
- **Score < 50**: Continue searching
- **No matches after 5 minutes**: Relax preferences automatically

### Preference Relaxation

After 5 minutes in queue:
- Age range expands by ±5 years
- Gender filter removed (match all)
- Region set to 'global'

## Queue Management

### Redis Data Structures

```
# Global queue (sorted by join time, premium users prioritized)
ZADD match:queue <score> <userId>

# Regional queues
ZADD match:region:us-east <score> <userId>
ZADD match:region:eu-west <score> <userId>

# User data (TTL: 10 minutes)
HSET match:user:{id} userId age gender languages region ageMin ageMax genders joinedAt isPremium connectionQuality

# Cooldown (TTL: 30 minutes)
SET match:cooldown:{user1}:{user2} 1 EX 1800

# Queue position cache (TTL: 60 seconds)
SET match:position:{userId} <position> EX 60

# Active sessions
ZADD match:active:sessions <timestamp> <sessionId>

# Daily stats
HINCRBY match:stats:2024-01-15 total_matches 1
```

### Score Calculation

```typescript
score = Date.now() - (isPremium ? 100000 : 0)
```

Premium users get a 100-second priority boost, placing them ahead of regular users who joined up to 100 seconds earlier.

## Performance Optimization

### 1. Redis-First Architecture

- All queue operations in Redis (sub-millisecond)
- PostgreSQL only for persistent records
- TTL-based cleanup prevents memory leaks

### 2. Match Loop Optimization

```typescript
// Process every 500ms
setInterval(async () => {
  await processMatches();
}, 500);

// Batch process up to 50 users per cycle
const users = await redisClient.zRange(MATCH_QUEUE_KEY, 0, 49);
```

### 3. Connection Pooling

- Single Redis connection per service instance
- Connection reuse across operations
- Automatic reconnection on failure

### 4. Caching Strategy

| Data | Cache | TTL |
|------|-------|-----|
| User preferences | Redis Hash | 10 min |
| Queue position | Redis String | 60 sec |
| Cooldown status | Redis String | 30 min |
| Session data | Redis Hash | 60 min |
| Daily stats | Redis Hash | 7 days |

### 5. Scaling Targets

| Metric | Target | Strategy |
|--------|--------|----------|
| Concurrent users | 10,000+ | Redis sorted sets |
| Match latency | < 1 second | 500ms match loop |
| Queue position update | 3 seconds | Interval-based |
| Memory per user | < 1KB | Efficient Redis hashes |

## WebSocket Event Flow

### Join Queue Flow

```
Client                          Server
  │                                │
  │── join_queue(preferences) ────▶│
  │                                │── Add to Redis queue
  │                                │── Calculate position
  │                                │── Start position updates
  │                                │
  │◀── queue_joined(position) ─────│
  │                                │
  │◀── queue_position_update ──────│ (every 3 seconds)
  │                                │
  │                                │── Match found!
  │                                │
  │◀── match_found(sessionId) ─────│
  │                                │
  │── session_ready(sessionId) ────▶│
  │                                │
  │◀── session_started(duration) ──│
```

### Match Flow

```
User A                          Server                          User B
  │                                │                                │
  │── join_queue ─────────────────▶│                                │
  │                                │◀── join_queue ─────────────────│
  │                                │                                │
  │                                │── Calculate compatibility      │
  │                                │── Score ≥ 50? YES              │
  │                                │── Create session in DB         │
  │                                │── Set cooldown                 │
  │                                │                                │
  │◀── match_found ────────────────│── match_found ────────────────▶│
  │                                │                                │
  │── WebRTC offer ───────────────▶│── forward offer ──────────────▶│
  │                                │                                │
  │                                │◀── WebRTC answer ──────────────│
  │◀── forward answer ─────────────│                                │
  │                                │                                │
  │◀── session_started ────────────│── session_started ────────────▶│
  │                  15s timer starts                               │
  │                                │                                │
  │── request_extend ─────────────▶│◀── request_extend ─────────────│
  │                                │── Both agreed!                 │
  │◀── session_extended ───────────│── session_extended ───────────▶│
  │                  +15s added                                     │
  │                                │                                │
  │── end_session ────────────────▶│── end_session ────────────────▶│
  │◀── session_ended ──────────────│── session_ended ──────────────▶│
  │                                │                                │
  │── auto re-join queue ─────────▶│◀── auto re-join queue ────────│
```

## Disconnection Handling

### Graceful Disconnect

```typescript
socket.on('disconnect', async () => {
  // Remove from queue
  await matchingQueue.removeFromQueue(userId);

  // Update user status
  await prisma.user.update({
    where: { id: userId },
    data: { status: 'offline' },
  });

  // Stop position updates
  stopPositionUpdates(socket);
});
```

### Stale User Cleanup

```typescript
// Run every 60 seconds
setInterval(async () => {
  await matchingQueue.cleanupStaleUsers();
}, 60000);

// Remove users who waited > 10 minutes
if (Date.now() - userData.joinedAt > 600000) {
  await this.removeFromQueue(userId);
}
```

### Reconnection Flow

```
Client disconnects
       ↓
Server removes from queue
       ↓
Client reconnects
       ↓
Server re-adds to queue
       ↓
Position recalculated
       ↓
Position updates resume
```

## Testing Scenarios

### Scenario 1: Basic Match

```
1. User A joins queue (age 25, male, prefers female)
2. User B joins queue (age 23, female, prefers male)
3. Match loop runs
4. Compatibility calculated: 50 (base) + 50 (same region) = 100
5. Match created, both notified
```

### Scenario 2: No Match Available

```
1. User A joins queue (age 25, male, prefers female)
2. No compatible users available
3. Position updates sent every 3 seconds
4. After 5 minutes, preferences relaxed
5. Match found with relaxed criteria
```

### Scenario 3: Cooldown Enforcement

```
1. User A and User B match
2. Cooldown set for 30 minutes
3. Both re-join queue immediately
4. Match loop skips pairing A and B
5. Other matches considered
```

### Scenario 4: Premium Priority

```
1. Regular user joins queue at T=0
2. Premium user joins queue at T=5
3. Premium user gets 100-second priority boost
4. Premium user matched before regular user
```

### Scenario 5: Region-Based Matching

```
1. User A (us-east) joins queue
2. User B (us-east) joins queue
3. User C (eu-west) joins queue
4. A and B matched first (same region bonus)
5. C waits for eu-west user or global match
```

### Scenario 6: Disconnect During Queue

```
1. User A joins queue at position 3
2. User A disconnects
3. Server removes A from queue
4. Position updates stop
5. User A reconnects
6. Re-added to queue at new position
```

### Scenario 7: Extend Flow

```
1. Session active, 5 seconds remaining
2. User A clicks "Extend"
3. User B receives "extend_requested" event
4. User B clicks "Accept"
5. Both receive "session_extended" event
6. Timer resets to 15 seconds
```

### Scenario 8: High Load

```
1. 1000 users join queue simultaneously
2. Redis handles all additions in < 100ms
3. Match loop processes 50 users per cycle
4. All users matched within ~10 seconds
5. Queue drains efficiently
```

## Monitoring & Metrics

### Key Metrics to Track

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| Queue Size | Users waiting for match | > 500 |
| Avg Wait Time | Time from join to match | > 30 seconds |
| Match Rate | Matches per minute | < 10 |
| Cooldown Hit Rate | % of pairs skipped due to cooldown | > 50% |
| Disconnect Rate | % of users who disconnect while queued | > 20% |
| Region Match Rate | % of matches within same region | < 30% |

### Logging

```typescript
logger.info(`User ${userId} added to queue at position ${position}`);
logger.info(`Match created: ${user1Id} <-> ${user2Id} (score: ${score})`);
logger.info(`Session ${sessionId} started`);
logger.info(`Session ${sessionId} ended, duration: ${duration}s`);
logger.info(`Cleaned up ${count} stale users from queue`);
```

## Configuration

### Environment Variables

```env
# Redis
REDIS_URL=redis://localhost:6379

# Match Loop
MATCH_LOOP_INTERVAL=500          # ms between match cycles
MATCH_BATCH_SIZE=50              # users processed per cycle
COOLDOWN_DURATION=1800           # seconds (30 min)
MAX_QUEUE_WAIT=300000            # ms (5 min) before relaxation

# Scoring
PREMIUM_PRIORITY_BONUS=100       # seconds priority for premium
REGION_BONUS=50                  # points for same region
LANGUAGE_BONUS=30                # points per common language
MIN_MATCH_SCORE=50               # minimum score to create match
```

## Future Enhancements

1. **Machine Learning Matching**: Train model on successful session data
2. **Interest-Based Matching**: Match users with shared interests
3. **Dynamic Queue Sizing**: Adjust batch size based on queue length
4. **Multi-Region Deployment**: Deploy matching service per region
5. **WebSocket Clustering**: Scale Socket.IO across multiple servers
6. **A/B Testing**: Test different scoring algorithms
7. **Real-Time Analytics Dashboard**: Live queue visualization
