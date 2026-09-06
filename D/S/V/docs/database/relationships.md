# Database Relationships & ER Diagram

## Entity Relationship Diagram

```mermaid
erDiagram
    USERS ||--o| USER_PREFERENCES : has
    USERS ||--o| USER_PROFILES : has
    USERS ||--o{ VIDEO_SESSIONS : participates_as_user1
    USERS ||--o{ VIDEO_SESSIONS : participates_as_user2
    USERS ||--o{ MATCH_HISTORY : initiates
    USERS ||--o{ MATCH_HISTORY : receives
    USERS ||--o{ FRIENDS : user1
    USERS ||--o{ FRIENDS : user2
    USERS ||--o{ BLOCKED_USERS : blocks
    USERS ||--o{ BLOCKED_USERS : blocked_by
    USERS ||--o{ MOMENTS : creates
    USERS ||--o{ REPORTS : makes
    USERS ||--o{ REPORTS : receives
    USERS ||--o{ MODERATION_ACTIONS : subject_to
    USERS ||--o{ SUBSCRIPTIONS : has
    USERS ||--o{ NOTIFICATIONS : receives
    USERS ||--o{ ANALYTICS_EVENTS : generates

    VIDEO_SESSIONS ||--o{ REPORTS : generates
    REPORTS ||--o| MODERATION_ACTIONS : triggers
    MOMENTS ||--o{ MOMENT_VIEWS : viewed_by
    MOMENTS ||--o{ MOMENT_LIKES : liked_by
    MOMENTS ||--o{ MOMENT_REPLIES : replied_to
    SUBSCRIPTIONS ||--o{ PAYMENT_HISTORY : generates

    USERS {
        uuid id PK
        string email UK
        string phone UK
        string password_hash
        string display_name
        int age
        enum gender
        string avatar_url
        boolean is_verified
        enum verification_status
        boolean is_premium
        enum premium_tier
        int severity_score
        boolean is_banned
        enum status
        timestamp created_at
    }

    USER_PREFERENCES {
        uuid id PK
        uuid user_id FK
        enum[] preferred_genders
        int age_range_min
        int age_range_max
        string[] languages
        string[] interest_tags
    }

    VIDEO_SESSIONS {
        uuid id PK
        uuid user1_id FK
        uuid user2_id FK
        enum status
        timestamp started_at
        int duration_seconds
        boolean extended
        int extend_count
        decimal moderation_score
    }

    MATCH_HISTORY {
        uuid id PK
        uuid user_id FK
        uuid matched_with FK
        uuid session_id FK
        timestamp matched_at
        int wait_time_seconds
        timestamp cooldown_until
    }

    FRIENDS {
        uuid id PK
        uuid user1_id FK
        uuid user2_id FK
        enum status
        timestamp accepted_at
        int chat_count
        boolean is_favorite
    }

    MOMENTS {
        uuid id PK
        uuid user_id FK
        string media_url
        enum media_type
        int view_count
        int like_count
        timestamp expires_at
        boolean is_expired
    }

    REPORTS {
        uuid id PK
        uuid reporter_id FK
        uuid reported_user_id FK
        uuid session_id FK
        enum reason
        enum status
        int severity
        int priority
    }

    SUBSCRIPTIONS {
        uuid id PK
        uuid user_id FK
        enum plan
        enum status
        string provider_subscription_id
        timestamp current_period_end
    }
```

## Relationship Types

### One-to-One
- `User` ↔ `UserPreferences` (each user has one preference set)
- `User` ↔ `UserProfile` (each user has one extended profile)
- `Subscription` ↔ `SubscriptionFeature` (plan defines features)

### One-to-Many
- `User` → `VideoSession` (user participates in many sessions)
- `User` → `Moment` (user creates many moments)
- `User` → `Report` (user makes/receives many reports)
- `User` → `Notification` (user receives many notifications)
- `Moment` → `MomentView` (moment has many views)
- `Moment` → `MomentLike` (moment has many likes)
- `Moment` → `MomentReply` (moment has many replies)
- `Subscription` → `PaymentHistory` (subscription has many payments)

### Many-to-Many (resolved via junction tables)
- `User` ↔ `User` via `Friend` (friendship)
- `User` ↔ `User` via `BlockedUser` (blocking)
- `User` ↔ `User` via `MatchHistory` (matching)

## Cascade Rules

| Parent | Child | On Delete | On Update |
|--------|-------|-----------|-----------|
| User | UserPreferences | CASCADE | CASCADE |
| User | UserProfile | CASCADE | CASCADE |
| User | Moments | CASCADE | CASCADE |
| User | ModerationActions | CASCADE | CASCADE |
| User | Subscriptions | CASCADE | CASCADE |
| User | Notifications | CASCADE | CASCADE |
| Moment | MomentViews | CASCADE | CASCADE |
| Moment | MomentLikes | CASCADE | CASCADE |
| Moment | MomentReplies | CASCADE | CASCADE |
| VideoSession | Reports | RESTRICT | CASCADE |

## Data Flow Diagrams

### User Registration Flow
```
Client → API → Validate Input → Hash Password → Create User → Create Preferences → Create Profile → Return JWT
```

### Video Session Flow
```
User A → Join Queue → Match Algorithm → Find User B → Create Session → WebRTC Setup → Start Timer → End/Extend → Log History
```

### Report Flow
```
User → Report → Create Record → Calculate Severity → Auto-Action? → Queue for Review → Moderator Decision → Apply Action → Update User Score
```

### Subscription Flow
```
User → Select Plan → Stripe Checkout → Webhook → Create Subscription → Update User Premium → Grant Features → Track Billing
```
