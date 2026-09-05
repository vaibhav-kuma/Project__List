# Database Scaling Guide - Millions of Users

## Scaling Strategy Overview

```
Phase 1: 0-100k users    → Single PostgreSQL instance + Redis
Phase 2: 100k-1M users   → Read replicas + Connection pooling + Partitioning
Phase 3: 1M-10M users    → Sharding + Caching layer + Archive strategy
Phase 4: 10M+ users      → Multi-region + Distributed DB + CDN caching
```

## 1. Horizontal Partitioning (Table Partitioning)

### Time-Based Partitioning

```sql
-- Video sessions partitioned by month
CREATE TABLE video_sessions (
    id UUID,
    user1_id UUID,
    user2_id UUID,
    status session_status,
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMP,
    duration_seconds INT,
    extended BOOLEAN,
    created_at TIMESTAMP DEFAULT NOW()
) PARTITION BY RANGE (started_at);

-- Monthly partitions (automate with pg_partman)
CREATE TABLE video_sessions_2024_01 PARTITION OF video_sessions
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE video_sessions_2024_02 PARTITION OF video_sessions
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Analytics events partitioned by day
CREATE TABLE analytics_events (
    id UUID,
    user_id UUID,
    event_type VARCHAR(50),
    event_data JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Daily partitions
CREATE TABLE analytics_events_2024_01_01 PARTITION OF analytics_events
    FOR VALUES FROM ('2024-01-01') TO ('2024-01-02');
```

### Hash-Based Partitioning (for users table)

```sql
-- Partition users by hash of ID (4 shards)
CREATE TABLE users (
    id UUID,
    email VARCHAR(255),
    -- ... other columns
) PARTITION BY HASH (id);

CREATE TABLE users_0 PARTITION OF users FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE users_1 PARTITION OF users FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE users_2 PARTITION OF users FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE users_3 PARTITION OF users FOR VALUES WITH (MODULUS 4, REMAINDER 3);
```

## 2. Read Replicas Configuration

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Application Layer                     │
├─────────────────────────────────────────────────────────────┤
│  WRITE Operations  →  Primary Database                      │
│  READ Operations   →  Read Replica 1, 2, 3                  │
└─────────────────────────────────────────────────────────────┘
```

### PgBouncer Connection Pooling

```ini
# pgbouncer.ini
[databases]
videochat_primary = host=primary.db port=5432 dbname=videochat
videochat_replica = host=replica.db port=5432 dbname=videochat

[pgbouncer]
pool_mode = transaction
max_client_conn = 10000
default_pool_size = 50
reserve_pool_size = 10
```

### Read/Write Routing (Application Level)

```typescript
// Database routing configuration
const dbRoutes = {
  writes: ['users', 'video_sessions', 'reports', 'subscriptions'],
  reads: ['match_history', 'moments', 'analytics', 'notifications'],
  both: ['friends', 'user_preferences'],  // Mixed operations
};
```

## 3. Sharding Strategy (10M+ Users)

### Shard by User ID Hash

```
Shard 1: user_id % 4 = 0  (Users A-F)
Shard 2: user_id % 4 = 1  (Users G-L)
Shard 3: user_id % 4 = 2  (Users M-R)
Shard 4: user_id % 4 = 3  (Users S-Z)
```

### Cross-Shard Operations

```sql
-- Global tables (not sharded)
-- - ban_list
-- - moderation_logs
-- - system_config

-- Shard-local tables
-- - users
-- - video_sessions
-- - match_history
-- - friends
-- - moments
-- - reports
```

### Shard Management

```typescript
class ShardManager {
  private shards: Map<number, DatabaseConnection>;

  getShard(userId: string): DatabaseConnection {
    const hash = this.hashUserId(userId);
    const shardId = hash % this.shards.size;
    return this.shards.get(shardId)!;
  }

  private hashUserId(userId: string): number {
    // Consistent hash function
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}
```

## 4. Caching Strategy

### Redis Cache Hierarchy

```
L1: Application Memory (Node.js) - Session data, user context
L2: Redis Cache - User profiles, preferences, active sessions
L3: Database - Persistent storage
```

### Cache Keys & TTLs

```typescript
const cacheConfig = {
  'user:{id}:profile': { ttl: 3600, tags: ['user'] },           // 1 hour
  'user:{id}:preferences': { ttl: 86400, tags: ['user'] },      // 24 hours
  'user:{id}:friends': { ttl: 3600, tags: ['user', 'friends'] }, // 1 hour
  'session:{id}': { ttl: 1800, tags: ['session'] },             // 30 min
  'match:queue': { ttl: 0, tags: ['match'] },                   // No TTL (list)
  'online:users': { ttl: 300, tags: ['online'] },               // 5 min
  'user:{id}:moments:feed': { ttl: 600, tags: ['moments'] },    // 10 min
  'ratelimit:{id}:{action}': { ttl: 3600, tags: ['ratelimit'] }, // 1 hour
  'report:queue:{status}': { ttl: 300, tags: ['reports'] },     // 5 min
};
```

### Cache Invalidation

```typescript
// Invalidate on updates
async function invalidateUserCache(userId: string) {
  const keys = await redis.keys(`user:${userId}:*`);
  if (keys.length > 0) {
    await redis.del(keys);
  }
}

// Tag-based invalidation
async function invalidateByTag(tag: string) {
  const keys = await redis.smembers(`cache:tags:${tag}`);
  if (keys.length > 0) {
    await redis.del(keys);
    await redis.del(`cache:tags:${tag}`);
  }
}
```

## 5. Performance Optimization

### Query Optimization

```sql
-- Use EXPLAIN ANALYZE for query planning
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT * FROM video_sessions
WHERE user1_id = 'uuid' AND status = 'active'
ORDER BY started_at DESC
LIMIT 10;

-- Covering indexes for frequent queries
CREATE INDEX idx_sessions_active_covering ON video_sessions(user1_id, started_at DESC)
INCLUDE (status, duration_seconds, extended)
WHERE status IN ('connecting', 'active');

-- Partial indexes for common filters
CREATE INDEX idx_online_users ON users(id, display_name, avatar_url)
WHERE status = 'online' AND is_banned = false;
```

### Connection Pool Sizing

```
Formula: pool_size = (core_count * 2) + effective_spindle_count

Example (8-core SSD):
pool_size = (8 * 2) + 1 = 17 connections per pool

Total connections:
- Primary: 50 connections
- Each Replica: 30 connections
- Total: 50 + (3 * 30) = 140 connections
```

### Batch Operations

```sql
-- Batch insert for analytics
INSERT INTO analytics_events (user_id, event_type, event_data, created_at)
VALUES 
  ('uuid1', 'page_view', '{"page": "/chat"}', NOW()),
  ('uuid2', 'match_found', '{"session": "uuid"}', NOW()),
  ('uuid3', 'session_end', '{"duration": 15}', NOW())
ON CONFLICT DO NOTHING;

-- Batch update for moment expiry
UPDATE moments
SET is_expired = true
WHERE expires_at < NOW() AND is_expired = false;
```

## 6. Monitoring & Alerting

### Key Metrics

```sql
-- Database size growth
SELECT 
    pg_size_pretty(pg_database_size('videochat')) as total_size,
    pg_size_pretty(pg_total_relation_size('video_sessions')) as sessions_size,
    pg_size_pretty(pg_total_relation_size('analytics_events')) as analytics_size;

-- Query performance
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 20;

-- Connection usage
SELECT 
    state,
    count(*),
    max(now() - backend_start) as longest_connection
FROM pg_stat_activity
GROUP BY state;
```

### Alerting Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| CPU Usage | > 70% | > 90% |
| Memory Usage | > 80% | > 95% |
| Disk Usage | > 75% | > 90% |
| Connection Count | > 80% max | > 95% max |
| Replication Lag | > 1s | > 5s |
| Query Time (p95) | > 500ms | > 2s |
| Cache Hit Rate | < 95% | < 90% |

## 7. Backup & Disaster Recovery

### Backup Strategy

```bash
# Daily full backup
pg_dump -h primary.db -U postgres -d videochat -Fc -f /backups/videochat_$(date +%Y%m%d).dump

# Hourly WAL archiving
archive_mode = on
archive_command = 'cp %p /backups/wal/%f'

# Point-in-time recovery
restore_command = 'cp /backups/wal/%f %p'
recovery_target_time = '2024-01-15 14:30:00'
```

### RPO/RTO Targets

| Component | RPO (Data Loss) | RTO (Downtime) |
|-----------|-----------------|----------------|
| User Data | 1 hour | 15 minutes |
| Sessions | 5 minutes | 5 minutes |
| Analytics | 24 hours | 1 hour |
| Reports | 0 (sync) | 30 minutes |

## 8. Migration Strategy

### Zero-Downtime Migrations

```sql
-- Add column without locking
ALTER TABLE users ADD COLUMN new_column VARCHAR(50);

-- Backfill in batches
DO $$
DECLARE
    batch_size INT := 1000;
    processed INT := 0;
BEGIN
    LOOP
        UPDATE users
        SET new_column = 'default_value'
        WHERE id IN (
            SELECT id FROM users
            WHERE new_column IS NULL
            LIMIT batch_size
        );
        
        GET DIAGNOSTICS processed = ROW_COUNT;
        EXIT WHEN processed = 0;
        
        PERFORM pg_sleep(0.1);  -- Avoid overwhelming DB
    END LOOP;
END $$;
```

### Rolling Schema Changes

1. Add new column (nullable)
2. Deploy code that writes to both old and new
3. Backfill existing data
4. Deploy code that reads from new
5. Remove old column (next deployment)

## 9. Cost Optimization

### Storage Tiers

| Data Type | Storage | Cost/Month (1TB) |
|-----------|---------|------------------|
| Hot (active users) | SSD | $120 |
| Warm (recent sessions) | HDD | $40 |
| Cold (archives) | S3 Glacier | $4 |
| Analytics (aggregated) | Columnar | $60 |

### Query Cost Reduction

```sql
-- materialized views for expensive queries
CREATE MATERIALIZED VIEW mv_daily_stats AS
SELECT 
    DATE(started_at) as date,
    COUNT(*) as total_sessions,
    AVG(duration_seconds) as avg_duration,
    COUNT(DISTINCT user1_id) as unique_users
FROM video_sessions
WHERE started_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(started_at);

-- Refresh daily
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_stats;
```

## 10. Scaling Checklist

### Pre-Launch (0-10k users)
- [ ] Single PostgreSQL instance
- [ ] Redis for caching
- [ ] Basic indexes
- [ ] Daily backups
- [ ] Connection pooling (PgBouncer)

### Growth Phase (10k-1M users)
- [ ] Read replicas (2-3)
- [ ] Table partitioning
- [ ] Query optimization
- [ ] Cache warming
- [ ] Monitoring setup

### Scale Phase (1M-10M users)
- [ ] Sharding (4-8 shards)
- [ ] Archive strategy
- [ ] Materialized views
- [ ] CDN for media
- [ ] Multi-AZ deployment

### Enterprise Phase (10M+ users)
- [ ] Multi-region replication
- [ ] Distributed cache (Redis Cluster)
- [ ] Database per service
- [ ] Event sourcing
- [ ] CQRS pattern
