# Database Quick Reference

## Schema Summary

| Table | Purpose | Key Fields | Retention |
|-------|---------|------------|-----------|
| `users` | User accounts | id, email, age, gender, status | Permanent (soft delete) |
| `user_preferences` | Match settings | preferred_genders, age_range | Permanent |
| `user_profiles` | Extended profile | social links, interests, location | Permanent |
| `video_sessions` | Chat sessions | user1/2_id, duration, extended | 1 year → archive |
| `match_history` | Match records | user_id, matched_with, cooldown | 2 years |
| `friends` | Friend connections | user1/2_id, status, chat_count | Permanent |
| `blocked_users` | Block list | blocker_id, blocked_id | Permanent |
| `ban_list` | Ban records | user_id, device_id, ip_address | Permanent |
| `moments` | Stories | media_url, expires_at, view_count | 30 days |
| `moment_views` | Story views | moment_id, viewer_id | 30 days |
| `moment_likes` | Story likes | moment_id, user_id | 30 days |
| `moment_replies` | Story comments | moment_id, content | 30 days |
| `reports` | User reports | reporter_id, reason, severity | 5 years |
| `moderation_actions` | Moderation log | user_id, action_type, expires_at | 5 years |
| `moderation_logs` | Audit trail | user_id, action, details | 5 years |
| `subscriptions` | Premium plans | user_id, plan, status, period | 7 years |
| `subscription_features` | Plan features | plan, feature flags | Permanent |
| `payment_history` | Payment records | user_id, amount, status | 7 years |
| `notifications` | User notifications | user_id, type, is_read | 90 days |
| `analytics_events` | Event tracking | user_id, event_type, data | 90 days raw |
| `rate_limits` | Rate limiting | identifier, action, count | Window-based |

## Common Queries

### Find Match
```sql
SELECT u.id, u.display_name, u.age, u.gender, u.avatar_url
FROM users u
WHERE u.status = 'online'
  AND u.is_banned = false
  AND u.age BETWEEN 18 AND 35
  AND u.id NOT IN (SELECT blocked_id FROM blocked_users WHERE blocker_id = :user_id)
  AND u.id NOT IN (SELECT matched_with FROM match_history WHERE user_id = :user_id AND cooldown_until > NOW())
ORDER BY u.last_active_at DESC
LIMIT 1;
```

### Load Moments Feed
```sql
SELECT m.*, u.display_name, u.avatar_url,
  EXISTS (SELECT 1 FROM moment_views WHERE moment_id = m.id AND viewer_id = :user_id) as has_viewed
FROM moments m
JOIN users u ON m.user_id = u.id
WHERE m.is_expired = false
  AND m.moderation_status = 'approved'
  AND m.user_id IN (
    SELECT user2_id FROM friends WHERE user1_id = :user_id AND status = 'accepted'
    UNION
    SELECT user1_id FROM friends WHERE user2_id = :user_id AND status = 'accepted'
  )
ORDER BY m.created_at DESC
LIMIT 20;
```

### Check Reports
```sql
SELECT r.id, r.reason, r.status, r.severity, r.created_at,
  u.display_name as reported_name
FROM reports r
JOIN users u ON r.reported_user_id = u.id
WHERE r.reporter_id = :user_id
ORDER BY r.created_at DESC
LIMIT 20;
```

### Get Friends List
```sql
SELECT 
  CASE WHEN f.user1_id = :user_id THEN f.user2_id ELSE f.user1_id END as friend_id,
  u.display_name, u.avatar_url, u.status, f.last_chat_at, f.chat_count, f.is_favorite
FROM friends f
JOIN users u ON (CASE WHEN f.user1_id = :user_id THEN f.user2_id ELSE f.user1_id END) = u.id
WHERE (f.user1_id = :user_id OR f.user2_id = :user_id)
  AND f.status = 'accepted'
ORDER BY f.last_chat_at DESC NULLS LAST, f.is_favorite DESC
LIMIT 50;
```

### Check Premium Status
```sql
SELECT s.plan, s.status, s.current_period_end, sf.*
FROM subscriptions s
JOIN subscription_features sf ON s.plan = sf.plan
WHERE s.user_id = :user_id
  AND s.status = 'active'
  AND s.current_period_end > NOW()
ORDER BY s.current_period_end DESC
LIMIT 1;
```

## Index Strategy

| Query Pattern | Index |
|--------------|-------|
| User login | `users(email)`, `users(phone)` |
| Online users | `users(status, age)` WHERE status='online' |
| Match queue | `users(gender, age)` WHERE is_banned=false |
| Session lookup | `video_sessions(user1_id, started_at DESC)` |
| Active sessions | `video_sessions(status)` WHERE status IN ('connecting','active') |
| Friend list | `friends(user1_id, status)`, `friends(user2_id, status)` |
| Block check | `blocked_users(blocker_id, blocked_id)` UNIQUE |
| Moments feed | `moments(user_id, created_at DESC)` WHERE is_expired=false |
| Report queue | `reports(status, priority DESC)` WHERE status='pending' |
| Unread notifications | `notifications(user_id, created_at DESC)` WHERE is_read=false |
| Active subscriptions | `subscriptions(user_id, status)` WHERE status='active' |
