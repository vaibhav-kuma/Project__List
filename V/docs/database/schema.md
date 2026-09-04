# Comprehensive Database Schema - VideoChat Platform

## 1. Complete SQL Schema (PostgreSQL)

### Core Tables

```sql
-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_status AS ENUM ('online', 'offline', 'away', 'banned');
CREATE TYPE gender AS ENUM ('male', 'female', 'non_binary', 'other', 'prefer_not_to_say');
CREATE TYPE session_status AS ENUM ('connecting', 'active', 'extended', 'ended', 'reported', 'timeout');
CREATE TYPE friend_status AS ENUM ('pending', 'accepted', 'blocked', 'removed');
CREATE TYPE moment_type AS ENUM ('image', 'video', 'gif');
CREATE TYPE report_status AS ENUM ('pending', 'reviewing', 'resolved', 'dismissed', 'escalated');
CREATE TYPE report_reason AS ENUM ('inappropriate', 'harassment', 'spam', 'underage', 'hate_speech', 'violence', 'scam', 'other');
CREATE TYPE moderation_action_type AS ENUM ('warning', 'temporary_ban', 'permanent_ban', 'shadow_ban', 'feature_restriction');
CREATE TYPE subscription_plan AS ENUM ('free', 'basic', 'pro', 'premium');
CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'expired', 'past_due', 'trialing');
CREATE TYPE subscription_provider AS ENUM ('stripe', 'apple_pay', 'google_pay', 'manual');
CREATE TYPE verification_status AS ENUM ('unverified', 'pending', 'verified', 'rejected');
CREATE TYPE notification_type AS ENUM ('match', 'friend_request', 'message', 'report_update', 'subscription', 'system');

-- ============================================
-- USERS
-- ============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(50) NOT NULL,
    age INT NOT NULL CHECK (age >= 18 AND age <= 120),
    gender gender NOT NULL,
    avatar_url VARCHAR(500),
    avatar_public_id VARCHAR(255),
    bio TEXT CHECK (char_length(bio) <= 500),
    
    -- Verification & Status
    is_verified BOOLEAN DEFAULT false,
    verification_status verification_status DEFAULT 'unverified',
    verification_provider VARCHAR(50),
    verification_date TIMESTAMP,
    status user_status DEFAULT 'offline',
    
    -- Premium & Subscription
    is_premium BOOLEAN DEFAULT false,
    premium_tier subscription_plan DEFAULT 'free',
    premium_expires_at TIMESTAMP,
    
    -- Moderation
    severity_score INT DEFAULT 0 CHECK (severity_score >= 0),
    is_banned BOOLEAN DEFAULT false,
    ban_reason TEXT,
    ban_expires_at TIMESTAMP,
    is_shadow_banned BOOLEAN DEFAULT false,
    
    -- Stats
    total_sessions INT DEFAULT 0,
    total_friends INT DEFAULT 0,
    total_reports_received INT DEFAULT 0,
    last_active_at TIMESTAMP DEFAULT NOW(),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,  -- Soft delete
    
    CONSTRAINT email_or_phone CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- ============================================
-- USER PREFERENCES
-- ============================================

CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    -- Matching Preferences
    preferred_genders gender[] DEFAULT '{}',
    age_range_min INT DEFAULT 18 CHECK (age_range_min >= 18),
    age_range_max INT DEFAULT 120 CHECK (age_range_max <= 120),
    languages VARCHAR(10)[] DEFAULT '{"en"}',
    countries VARCHAR(2)[] DEFAULT '{}',
    
    -- Advanced (Premium)
    distance_km INT,
    interest_tags VARCHAR(50)[] DEFAULT '{}',
    
    -- Privacy
    show_age BOOLEAN DEFAULT true,
    show_gender BOOLEAN DEFAULT true,
    show_location BOOLEAN DEFAULT false,
    allow_messages_from VARCHAR(20) DEFAULT 'friends',  -- 'everyone', 'friends', 'none'
    
    -- Notifications
    push_notifications BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT true,
    match_notifications BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT valid_age_range CHECK (age_range_min <= age_range_max)
);

-- ============================================
-- USER PROFILES (Extended)
-- ============================================

CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    -- Social Links
    instagram_handle VARCHAR(100),
    tiktok_handle VARCHAR(100),
    snapchat_handle VARCHAR(100),
    
    -- Interests
    interests VARCHAR(50)[] DEFAULT '{}',
    zodiac_sign VARCHAR(20),
    occupation VARCHAR(100),
    company VARCHAR(100),
    school VARCHAR(100),
    
    -- Location (approximate for privacy)
    city VARCHAR(100),
    country VARCHAR(2),
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Device Info
    device_type VARCHAR(20),  -- 'ios', 'android', 'web'
    app_version VARCHAR(20),
    last_ip INET,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- VIDEO SESSIONS
-- ============================================

CREATE TABLE video_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id UUID NOT NULL REFERENCES users(id),
    user2_id UUID NOT NULL REFERENCES users(id),
    
    -- Session Details
    status session_status DEFAULT 'connecting',
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP,
    duration_seconds INT DEFAULT 0,
    
    -- Extension
    extended BOOLEAN DEFAULT false,
    extend_count INT DEFAULT 0,
    max_duration_seconds INT DEFAULT 15,
    extended_by_user1 BOOLEAN DEFAULT false,
    extended_by_user2 BOOLEAN DEFAULT false,
    
    -- Quality Metrics
    video_quality VARCHAR(20),  -- '360p', '480p', '720p', '1080p'
    avg_bitrate INT,
    packet_loss_percent DECIMAL(5,2),
    connection_type VARCHAR(20),  -- 'p2p', 'turn', 'sfu'
    
    -- Moderation
    was_reported BOOLEAN DEFAULT false,
    reported_by UUID REFERENCES users(id),
    report_reason report_reason,
    moderation_score DECIMAL(3,2),  -- AI moderation score 0-1
    flagged_content BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT different_users CHECK (user1_id != user2_id),
    CONSTRAINT valid_duration CHECK (duration_seconds >= 0)
);

-- ============================================
-- MATCH HISTORY
-- ============================================

CREATE TABLE match_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    matched_with UUID NOT NULL REFERENCES users(id),
    session_id UUID REFERENCES video_sessions(id),
    
    -- Match Details
    matched_at TIMESTAMP DEFAULT NOW(),
    wait_time_seconds INT,
    match_type VARCHAR(20) DEFAULT 'random',  -- 'random', 'interest', 'location', 'premium'
    
    -- Outcome
    connected BOOLEAN DEFAULT false,
    duration_seconds INT DEFAULT 0,
    extended BOOLEAN DEFAULT false,
    added_as_friend BOOLEAN DEFAULT false,
    
    -- Cooldown
    cooldown_until TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT different_users CHECK (user_id != matched_with)
);

-- ============================================
-- FRIENDS
-- ============================================

CREATE TABLE friends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id UUID NOT NULL REFERENCES users(id),
    user2_id UUID NOT NULL REFERENCES users(id),
    
    status friend_status DEFAULT 'pending',
    
    -- Relationship Details
    requested_by UUID REFERENCES users(id),
    accepted_at TIMESTAMP,
    last_chat_at TIMESTAMP,
    chat_count INT DEFAULT 0,
    
    -- Privacy
    is_muted BOOLEAN DEFAULT false,
    is_favorite BOOLEAN DEFAULT false,
    notes TEXT CHECK (char_length(notes) <= 200),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT different_users CHECK (user1_id != user2_id),
    CONSTRAINT unique_friendship UNIQUE (user1_id, user2_id)
);

-- ============================================
-- BLOCK LIST
-- ============================================

CREATE TABLE blocked_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES users(id),
    blocked_id UUID NOT NULL REFERENCES users(id),
    reason VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT different_users CHECK (blocker_id != blocked_id),
    CONSTRAINT unique_block UNIQUE (blocker_id, blocked_id)
);

-- ============================================
-- BAN LIST
-- ============================================

CREATE TABLE ban_list (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    device_id VARCHAR(255),
    ip_address INET,
    
    ban_type VARCHAR(20) NOT NULL,  -- 'user', 'device', 'ip'
    reason TEXT NOT NULL,
    severity INT NOT NULL CHECK (severity BETWEEN 1 AND 5),
    
    banned_by UUID REFERENCES users(id),  -- Moderator ID
    expires_at TIMESTAMP,  -- NULL = permanent
    appeal_status VARCHAR(20) DEFAULT 'none',  -- 'none', 'pending', 'approved', 'rejected'
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT ban_target CHECK (user_id IS NOT NULL OR device_id IS NOT NULL OR ip_address IS NOT NULL)
);

-- ============================================
-- MOMENTS / STORIES
-- ============================================

CREATE TABLE moments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    
    -- Content
    media_url VARCHAR(500) NOT NULL,
    media_public_id VARCHAR(255) NOT NULL,
    media_type moment_type NOT NULL,
    thumbnail_url VARCHAR(500),
    caption TEXT CHECK (char_length(caption) <= 300),
    
    -- Metadata
    duration_seconds INT,  -- For video moments
    width INT,
    height INT,
    file_size INT,
    
    -- Engagement
    view_count INT DEFAULT 0,
    like_count INT DEFAULT 0,
    reply_count INT DEFAULT 0,
    
    -- Moderation
    moderation_status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'approved', 'rejected'
    moderation_score DECIMAL(3,2),
    
    -- Expiry
    expires_at TIMESTAMP NOT NULL,
    is_expired BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT valid_media_type CHECK (
        (media_type = 'video' AND duration_seconds IS NOT NULL) OR
        (media_type != 'video')
    )
);

-- ============================================
-- MOMENT VIEWS
-- ============================================

CREATE TABLE moment_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    moment_id UUID NOT NULL REFERENCES moments(id) ON DELETE CASCADE,
    viewer_id UUID NOT NULL REFERENCES users(id),
    viewed_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_view UNIQUE (moment_id, viewer_id)
);

-- ============================================
-- MOMENT LIKES
-- ============================================

CREATE TABLE moment_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    moment_id UUID NOT NULL REFERENCES moments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_like UNIQUE (moment_id, user_id)
);

-- ============================================
-- MOMENT REPLIES
-- ============================================

CREATE TABLE moment_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    moment_id UUID NOT NULL REFERENCES moments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL CHECK (char_length(content) <= 500),
    created_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- ============================================
-- REPORTS
-- ============================================

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES users(id),
    reported_user_id UUID NOT NULL REFERENCES users(id),
    session_id UUID REFERENCES video_sessions(id),
    moment_id UUID REFERENCES moments(id),
    
    -- Report Details
    reason report_reason NOT NULL,
    description TEXT CHECK (char_length(description) <= 1000),
    status report_status DEFAULT 'pending',
    
    -- Evidence
    evidence_urls TEXT[],
    screenshot_url VARCHAR(500),
    
    -- Moderation
    severity INT DEFAULT 1 CHECK (severity BETWEEN 1 AND 5),
    priority INT DEFAULT 0,  -- Higher = more urgent
    assigned_to UUID REFERENCES users(id),  -- Moderator ID
    
    -- Resolution
    resolution_notes TEXT,
    resolved_at TIMESTAMP,
    resolved_by UUID REFERENCES users(id),
    action_taken moderation_action_type,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT different_users CHECK (reporter_id != reported_user_id),
    CONSTRAINT report_target CHECK (session_id IS NOT NULL OR moment_id IS NOT NULL)
);

-- ============================================
-- MODERATION ACTIONS
-- ============================================

CREATE TABLE moderation_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    report_id UUID REFERENCES reports(id),
    
    action_type moderation_action_type NOT NULL,
    reason TEXT NOT NULL,
    details JSONB,
    
    -- Duration
    duration_hours INT,
    expires_at TIMESTAMP,
    
    -- Moderator
    moderator_id UUID REFERENCES users(id),
    is_auto BOOLEAN DEFAULT false,  -- Auto-moderated by ML
    
    -- Appeal
    appeal_status VARCHAR(20) DEFAULT 'none',
    appeal_notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT valid_duration CHECK (
        (action_type = 'permanent_ban' AND duration_hours IS NULL) OR
        (action_type != 'permanent_ban' AND duration_hours IS NOT NULL)
    )
);

-- ============================================
-- MODERATION LOGS (Audit Trail)
-- ============================================

CREATE TABLE moderation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- SUBSCRIPTIONS
-- ============================================

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    
    -- Plan Details
    plan subscription_plan NOT NULL,
    status subscription_status DEFAULT 'active',
    provider subscription_provider NOT NULL,
    
    -- Provider IDs
    provider_subscription_id VARCHAR(255) NOT NULL,
    provider_customer_id VARCHAR(255),
    provider_payment_method_id VARCHAR(255),
    
    -- Billing
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    interval VARCHAR(20) NOT NULL,  -- 'monthly', 'yearly'
    
    -- Period
    trial_ends_at TIMESTAMP,
    current_period_start TIMESTAMP NOT NULL,
    current_period_end TIMESTAMP NOT NULL,
    
    -- Cancellation
    cancel_at_period_end BOOLEAN DEFAULT false,
    cancelled_at TIMESTAMP,
    cancellation_reason VARCHAR(200),
    
    -- Metadata
    metadata JSONB,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- SUBSCRIPTION FEATURES (What each plan includes)
-- ============================================

CREATE TABLE subscription_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan subscription_plan NOT NULL UNIQUE,
    
    -- Features
    unlimited_extends BOOLEAN DEFAULT false,
    gender_filter BOOLEAN DEFAULT false,
    location_filter BOOLEAN DEFAULT false,
    advanced_filters BOOLEAN DEFAULT false,
    priority_matching BOOLEAN DEFAULT false,
    rewind_feature BOOLEAN DEFAULT false,
    see_who_liked_you BOOLEAN DEFAULT false,
    ad_free BOOLEAN DEFAULT false,
    video_filters BOOLEAN DEFAULT false,
    hd_video BOOLEAN DEFAULT false,
    read_receipts BOOLEAN DEFAULT false,
    profile_boosts_per_month INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- PAYMENT HISTORY
-- ============================================

CREATE TABLE payment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    subscription_id UUID REFERENCES subscriptions(id),
    
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) NOT NULL,  -- 'succeeded', 'failed', 'refunded', 'pending'
    
    provider VARCHAR(20) NOT NULL,
    provider_payment_id VARCHAR(255),
    provider_invoice_id VARCHAR(255),
    
    failure_reason VARCHAR(200),
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    
    type notification_type NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT,
    
    -- Target
    target_type VARCHAR(50),
    target_id UUID,
    
    -- Status
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    
    -- Delivery
    delivered_via VARCHAR(20)[] DEFAULT '{"in_app"}',  -- 'in_app', 'push', 'email'
    push_sent BOOLEAN DEFAULT false,
    email_sent BOOLEAN DEFAULT false,
    
    -- Expiry
    expires_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- ANALYTICS EVENTS
-- ============================================

CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    session_id UUID REFERENCES video_sessions(id),
    
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB,
    
    device_type VARCHAR(20),
    platform VARCHAR(20),
    app_version VARCHAR(20),
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- RATE LIMITS
-- ============================================

CREATE TABLE rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier VARCHAR(255) NOT NULL,  -- IP, user_id, device_id
    action VARCHAR(50) NOT NULL,  -- 'login', 'report', 'message', etc.
    count INT DEFAULT 1,
    window_start TIMESTAMP DEFAULT NOW(),
    window_end TIMESTAMP NOT NULL,
    
    UNIQUE (identifier, action, window_start)
);
```

## 2. Indexes for Performance Optimization

```sql
-- ============================================
-- USERS INDEXES
-- ============================================

-- Authentication lookups
CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX idx_users_phone ON users(phone) WHERE phone IS NOT NULL;

-- Matching queries
CREATE INDEX idx_users_status_age ON users(status, age) WHERE status = 'online';
CREATE INDEX idx_users_gender_age ON users(gender, age) WHERE is_banned = false;
CREATE INDEX idx_users_premium ON users(is_premium, premium_expires_at) WHERE is_premium = true;

-- Moderation
CREATE INDEX idx_users_severity_score ON users(severity_score) WHERE severity_score > 0;
CREATE INDEX idx_users_banned ON users(is_banned, ban_expires_at) WHERE is_banned = true;

-- Activity
CREATE INDEX idx_users_last_active ON users(last_active_at DESC);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- Soft delete filter
CREATE INDEX idx_users_active ON users(id) WHERE deleted_at IS NULL;

-- ============================================
-- VIDEO SESSIONS INDEXES
-- ============================================

-- Active sessions
CREATE INDEX idx_sessions_status ON video_sessions(status) WHERE status IN ('connecting', 'active');
CREATE INDEX idx_sessions_user1 ON video_sessions(user1_id, started_at DESC);
CREATE INDEX idx_sessions_user2 ON video_sessions(user2_id, started_at DESC);

-- Reporting
CREATE INDEX idx_sessions_reported ON video_sessions(was_reported) WHERE was_reported = true;
CREATE INDEX idx_sessions_moderation_score ON video_sessions(moderation_score DESC) WHERE moderation_score > 0.5;

-- Time-based queries
CREATE INDEX idx_sessions_started_at ON video_sessions(started_at DESC);
CREATE INDEX idx_sessions_created_at ON video_sessions(created_at DESC);

-- Composite for user session history
CREATE INDEX idx_sessions_user_history ON video_sessions(user1_id, user2_id, started_at DESC);

-- ============================================
-- MATCH HISTORY INDEXES
-- ============================================

-- Cooldown checks
CREATE INDEX idx_match_cooldown ON match_history(user_id, matched_with, cooldown_until);
CREATE INDEX idx_match_cooldown_active ON match_history(user_id, cooldown_until) WHERE cooldown_until > NOW();

-- User match history
CREATE INDEX idx_match_history_user ON match_history(user_id, matched_at DESC);
CREATE INDEX idx_match_history_matched_with ON match_history(matched_with, matched_at DESC);

-- Session linkage
CREATE INDEX idx_match_history_session ON match_history(session_id) WHERE session_id IS NOT NULL;

-- ============================================
-- FRIENDS INDEXES
-- ============================================

-- Friendship lookups (bidirectional)
CREATE INDEX idx_friends_user1 ON friends(user1_id, status);
CREATE INDEX idx_friends_user2 ON friends(user2_id, status);
CREATE INDEX idx_friends_status ON friends(status) WHERE status = 'accepted';

-- Recent activity
CREATE INDEX idx_friends_last_chat ON friends(last_chat_at DESC) WHERE last_chat_at IS NOT NULL;
CREATE INDEX idx_friends_favorite ON friends(user1_id) WHERE is_favorite = true;

-- ============================================
-- BLOCKED USERS INDEXES
-- ============================================

CREATE INDEX idx_blocked_blocker ON blocked_users(blocker_id);
CREATE INDEX idx_blocked_blocked ON blocked_users(blocked_id);
CREATE UNIQUE INDEX idx_blocked_unique ON blocked_users(blocker_id, blocked_id);

-- ============================================
-- MOMENTS INDEXES
-- ============================================

-- Active moments
CREATE INDEX idx_moments_user ON moments(user_id, created_at DESC) WHERE is_expired = false;
CREATE INDEX idx_moments_expires ON moments(expires_at) WHERE is_expired = false;
CREATE INDEX idx_moments_moderation ON moments(moderation_status) WHERE moderation_status = 'pending';

-- Engagement
CREATE INDEX idx_moments_popular ON moments(view_count DESC, created_at DESC) WHERE is_expired = false;
CREATE INDEX idx_moments_likes ON moments(like_count DESC) WHERE is_expired = false;

-- Views and likes
CREATE INDEX idx_moment_views_moment ON moment_views(moment_id);
CREATE INDEX idx_moment_views_viewer ON moment_views(viewer_id, viewed_at DESC);
CREATE INDEX idx_moment_likes_moment ON moment_likes(moment_id);
CREATE INDEX idx_moment_likes_user ON moment_likes(user_id, created_at DESC);

-- Replies
CREATE INDEX idx_moment_replies_moment ON moment_replies(moment_id, created_at DESC) WHERE deleted_at IS NULL;

-- ============================================
-- REPORTS INDEXES
-- ============================================

-- Moderation queue
CREATE INDEX idx_reports_status ON reports(status, priority DESC) WHERE status = 'pending';
CREATE INDEX idx_reports_assigned ON reports(assigned_to, status) WHERE status = 'reviewing';
CREATE INDEX idx_reports_severity ON reports(severity DESC, created_at) WHERE status = 'pending';

-- User reports
CREATE INDEX idx_reports_reporter ON reports(reporter_id, created_at DESC);
CREATE INDEX idx_reports_reported ON reports(reported_user_id, created_at DESC);

-- Session linkage
CREATE INDEX idx_reports_session ON reports(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_reports_moment ON reports(moment_id) WHERE moment_id IS NOT NULL;

-- ============================================
-- MODERATION INDEXES
-- ============================================

CREATE INDEX idx_moderation_actions_user ON moderation_actions(user_id, created_at DESC);
CREATE INDEX idx_moderation_actions_expires ON moderation_actions(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_moderation_actions_auto ON moderation_actions(is_auto) WHERE is_auto = true;

CREATE INDEX idx_moderation_logs_user ON moderation_logs(user_id, created_at DESC);
CREATE INDEX idx_moderation_logs_action ON moderation_logs(action, created_at DESC);

-- ============================================
-- SUBSCRIPTIONS INDEXES
-- ============================================

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id, status) WHERE status = 'active';
CREATE INDEX idx_subscriptions_period_end ON subscriptions(current_period_end) WHERE status = 'active';
CREATE INDEX idx_subscriptions_provider ON subscriptions(provider, provider_subscription_id);
CREATE INDEX idx_subscriptions_trial ON subscriptions(trial_ends_at) WHERE trial_ends_at IS NOT NULL;

-- ============================================
-- NOTIFICATIONS INDEXES
-- ============================================

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE is_read = false;
CREATE INDEX idx_notifications_type ON notifications(type, created_at DESC);
CREATE INDEX idx_notifications_expires ON notifications(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================
-- ANALYTICS INDEXES
-- ============================================

CREATE INDEX idx_analytics_user ON analytics_events(user_id, created_at DESC);
CREATE INDEX idx_analytics_event_type ON analytics_events(event_type, created_at DESC);
CREATE INDEX idx_analytics_session ON analytics_events(session_id) WHERE session_id IS NOT NULL;

-- ============================================
-- PARTITIONED INDEXES (for large tables)
-- ============================================

-- Example: Partition video_sessions by month
-- CREATE INDEX idx_sessions_2024_01 ON video_sessions_2024_01(started_at);
-- CREATE INDEX idx_sessions_2024_02 ON video_sessions_2024_02(started_at);
```

## 3. Data Retention Policies

```sql
-- ============================================
-- RETENTION POLICY FUNCTIONS
-- ============================================

-- Clean up expired moments
CREATE OR REPLACE FUNCTION cleanup_expired_moments()
RETURNS VOID AS $$
BEGIN
    UPDATE moments
    SET is_expired = true
    WHERE expires_at < NOW() AND is_expired = false;
    
    -- Delete moments older than 30 days
    DELETE FROM moments
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    RAISE NOTICE 'Cleaned up expired moments';
END;
$$ LANGUAGE plpgsql;

-- Clean up old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS VOID AS $$
BEGIN
    DELETE FROM notifications
    WHERE created_at < NOW() - INTERVAL '90 days' AND is_read = true;
    
    RAISE NOTICE 'Cleaned up old notifications';
END;
$$ LANGUAGE plpgsql;

-- Archive old video sessions
CREATE OR REPLACE FUNCTION archive_old_sessions()
RETURNS VOID AS $$
BEGIN
    -- Move sessions older than 1 year to archive table
    INSERT INTO video_sessions_archive
    SELECT * FROM video_sessions
    WHERE created_at < NOW() - INTERVAL '1 year'
    ON CONFLICT DO NOTHING;
    
    DELETE FROM video_sessions
    WHERE created_at < NOW() - INTERVAL '1 year';
    
    RAISE NOTICE 'Archived old sessions';
END;
$$ LANGUAGE plpgsql;

-- Clean up rate limits
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS VOID AS $$
BEGIN
    DELETE FROM rate_limits
    WHERE window_end < NOW();
    
    RAISE NOTICE 'Cleaned up expired rate limits';
END;
$$ LANGUAGE plpgsql;

-- Clean up match history cooldowns
CREATE OR REPLACE FUNCTION cleanup_match_cooldowns()
RETURNS VOID AS $$
BEGIN
    UPDATE match_history
    SET cooldown_until = NULL
    WHERE cooldown_until < NOW();
    
    RAISE NOTICE 'Cleaned up expired cooldowns';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SCHEDULED JOBS (pg_cron)
-- ============================================

-- Run cleanup jobs daily at 2 AM
SELECT cron.schedule('cleanup-moments', '0 2 * * *', 'SELECT cleanup_expired_moments()');
SELECT cron.schedule('cleanup-notifications', '0 2 * * *', 'SELECT cleanup_old_notifications()');
SELECT cron.schedule('archive-sessions', '0 3 * * 0', 'SELECT archive_old_sessions()');  -- Weekly
SELECT cron.schedule('cleanup-rate-limits', '0 */6 * * *', 'SELECT cleanup_rate_limits()');  -- Every 6 hours
SELECT cron.schedule('cleanup-cooldowns', '0 1 * * *', 'SELECT cleanup_match_cooldowns()');

-- ============================================
-- RETENTION SCHEDULE SUMMARY
-- ============================================
```

| Data Type | Retention Period | Action |
|-----------|-----------------|--------|
| Moments | 24 hours (active) + 30 days (archive) | Soft delete, then hard delete |
| Notifications | 90 days (read), 30 days (unread) | Hard delete |
| Video Sessions | 1 year (active), then archive | Move to archive table |
| Match History | 2 years | Aggregate stats, delete raw |
| Reports | 5 years (legal requirement) | Permanent storage |
| Moderation Actions | 5 years | Permanent storage |
| Payment History | 7 years (tax compliance) | Permanent storage |
| Analytics Events | 90 days (raw), 2 years (aggregated) | Aggregate and delete raw |
| Rate Limits | Window-based (1 hour max) | Auto-expire |
| Ban List | Permanent or until expiry | Manual review |

## 4. Example Queries for Common Operations

```sql
-- ============================================
-- FINDING MATCHES
-- ============================================

-- Get next compatible user from queue
CREATE OR REPLACE FUNCTION find_next_match(
    p_user_id UUID,
    p_age_min INT,
    p_age_max INT,
    p_preferred_genders gender[],
    p_languages VARCHAR(10)[]
)
RETURNS TABLE (
    matched_user_id UUID,
    display_name VARCHAR(50),
    age INT,
    gender gender,
    avatar_url VARCHAR(500),
    compatibility_score DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.display_name,
        u.age,
        u.gender,
        u.avatar_url,
        (
            -- Compatibility scoring
            CASE WHEN u.age BETWEEN p_age_min AND p_age_max THEN 30 ELSE 0 END +
            CASE WHEN p_preferred_genders = '{}' OR u.gender = ANY(p_preferred_genders) THEN 40 ELSE 0 END +
            CASE WHEN p_languages && ARRAY(SELECT languages FROM user_preferences WHERE user_id = u.id) THEN 20 ELSE 0 END +
            CASE WHEN u.is_premium THEN 10 ELSE 0 END
        ) as compatibility_score
    FROM users u
    WHERE u.id != p_user_id
        AND u.status = 'online'
        AND u.is_banned = false
        AND u.age BETWEEN p_age_min AND p_age_max
        AND (p_preferred_genders = '{}' OR u.gender = ANY(p_preferred_genders))
        -- Not blocked
        AND u.id NOT IN (SELECT blocked_id FROM blocked_users WHERE blocker_id = p_user_id)
        AND u.id NOT IN (SELECT blocker_id FROM blocked_users WHERE blocked_id = p_user_id)
        -- Not recently matched (cooldown)
        AND u.id NOT IN (
            SELECT matched_with FROM match_history 
            WHERE user_id = p_user_id 
            AND cooldown_until > NOW()
        )
        -- Not in active session
        AND u.id NOT IN (
            SELECT user1_id FROM video_sessions WHERE status IN ('connecting', 'active', 'extended')
            UNION
            SELECT user2_id FROM video_sessions WHERE status IN ('connecting', 'active', 'extended')
        )
    ORDER BY compatibility_score DESC, u.last_active_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Get user's match queue position
CREATE OR REPLACE FUNCTION get_queue_position(p_user_id UUID)
RETURNS INT AS $$
DECLARE
    v_position INT;
BEGIN
    SELECT COUNT(*) INTO v_position
    FROM users u
    WHERE u.status = 'online'
        AND u.is_banned = false
        AND u.id NOT IN (
            SELECT user1_id FROM video_sessions WHERE status IN ('connecting', 'active', 'extended')
            UNION
            SELECT user2_id FROM video_sessions WHERE status IN ('connecting', 'active', 'extended')
        )
        AND (
            u.is_premium = false OR
            (u.is_premium AND u.premium_expires_at > NOW())
        )
        AND (
            SELECT last_active_at FROM users WHERE id = p_user_id
        ) > u.last_active_at;
    
    RETURN v_position;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- LOADING MOMENTS
-- ============================================

-- Get active moments for user's feed
CREATE OR REPLACE FUNCTION get_moments_feed(
    p_user_id UUID,
    p_limit INT DEFAULT 20
)
RETURNS TABLE (
    moment_id UUID,
    user_id UUID,
    display_name VARCHAR(50),
    avatar_url VARCHAR(500),
    media_url VARCHAR(500),
    media_type moment_type,
    thumbnail_url VARCHAR(500),
    caption TEXT,
    view_count INT,
    like_count INT,
    has_viewed BOOLEAN,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.user_id,
        u.display_name,
        u.avatar_url,
        m.media_url,
        m.media_type,
        m.thumbnail_url,
        m.caption,
        m.view_count,
        m.like_count,
        EXISTS (SELECT 1 FROM moment_views WHERE moment_id = m.id AND viewer_id = p_user_id) as has_viewed,
        m.created_at
    FROM moments m
    JOIN users u ON m.user_id = u.id
    WHERE m.is_expired = false
        AND m.moderation_status = 'approved'
        AND m.user_id != p_user_id
        AND m.user_id IN (
            -- Friends' moments
            SELECT user2_id FROM friends WHERE user1_id = p_user_id AND status = 'accepted'
            UNION
            SELECT user1_id FROM friends WHERE user2_id = p_user_id AND status = 'accepted'
        )
    ORDER BY m.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Record moment view
CREATE OR REPLACE FUNCTION record_moment_view(
    p_moment_id UUID,
    p_viewer_id UUID
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO moment_views (moment_id, viewer_id)
    VALUES (p_moment_id, p_viewer_id)
    ON CONFLICT DO NOTHING;
    
    UPDATE moments
    SET view_count = view_count + 1
    WHERE id = p_moment_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CHECKING REPORTS
-- ============================================

-- Get user's report history
CREATE OR REPLACE FUNCTION get_user_reports(
    p_user_id UUID,
    p_limit INT DEFAULT 20,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    report_id UUID,
    reported_user_id UUID,
    reported_display_name VARCHAR(50),
    reason report_reason,
    status report_status,
    created_at TIMESTAMP,
    resolved_at TIMESTAMP,
    action_taken moderation_action_type
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.reported_user_id,
        u.display_name,
        r.reason,
        r.status,
        r.created_at,
        r.resolved_at,
        r.action_taken
    FROM reports r
    JOIN users u ON r.reported_user_id = u.id
    WHERE r.reporter_id = p_user_id
    ORDER BY r.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Get moderation queue
CREATE OR REPLACE FUNCTION get_moderation_queue(
    p_moderator_id UUID,
    p_limit INT DEFAULT 50
)
RETURNS TABLE (
    report_id UUID,
    reporter_id UUID,
    reporter_name VARCHAR(50),
    reported_user_id UUID,
    reported_name VARCHAR(50),
    reason report_reason,
    severity INT,
    priority INT,
    evidence_urls TEXT[],
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.reporter_id,
        reporter.display_name,
        r.reported_user_id,
        reported.display_name,
        r.reason,
        r.severity,
        r.priority,
        r.evidence_urls,
        r.created_at
    FROM reports r
    JOIN users reporter ON r.reporter_id = reporter.id
    JOIN users reported ON r.reported_user_id = reported.id
    WHERE r.status = 'pending'
    ORDER BY r.priority DESC, r.severity DESC, r.created_at ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Calculate user severity score
CREATE OR REPLACE FUNCTION calculate_severity_score(p_user_id UUID)
RETURNS INT AS $$
DECLARE
    v_score INT;
BEGIN
    SELECT COALESCE(SUM(
        CASE r.reason
            WHEN 'underage' THEN 10
            WHEN 'hate_speech' THEN 8
            WHEN 'harassment' THEN 5
            WHEN 'inappropriate' THEN 3
            WHEN 'violence' THEN 7
            WHEN 'scam' THEN 4
            WHEN 'spam' THEN 2
            ELSE 1
        END
    ), 0) INTO v_score
    FROM reports r
    WHERE r.reported_user_id = p_user_id
        AND r.status IN ('resolved', 'escalated')
        AND r.action_taken IS NOT NULL
        AND r.created_at > NOW() - INTERVAL '90 days';
    
    RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FRIEND OPERATIONS
-- ============================================

-- Get user's friends list
CREATE OR REPLACE FUNCTION get_friends_list(
    p_user_id UUID,
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    friend_id UUID,
    display_name VARCHAR(50),
    avatar_url VARCHAR(500),
    status user_status,
    last_chat_at TIMESTAMP,
    chat_count INT,
    is_favorite BOOLEAN,
    is_muted BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE WHEN f.user1_id = p_user_id THEN f.user2_id ELSE f.user1_id END as friend_id,
        u.display_name,
        u.avatar_url,
        u.status,
        f.last_chat_at,
        f.chat_count,
        f.is_favorite,
        f.is_muted
    FROM friends f
    JOIN users u ON (
        CASE WHEN f.user1_id = p_user_id THEN f.user2_id ELSE f.user1_id END
    ) = u.id
    WHERE (f.user1_id = p_user_id OR f.user2_id = p_user_id)
        AND f.status = 'accepted'
    ORDER BY f.last_chat_at DESC NULLS LAST, f.is_favorite DESC, u.display_name ASC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SUBSCRIPTION OPERATIONS
-- ============================================

-- Check if user has active premium
CREATE OR REPLACE FUNCTION is_premium_active(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM subscriptions
        WHERE user_id = p_user_id
            AND status = 'active'
            AND current_period_end > NOW()
            AND cancel_at_period_end = false
    );
END;
$$ LANGUAGE plpgsql;

-- Get subscription details
CREATE OR REPLACE FUNCTION get_subscription_details(p_user_id UUID)
RETURNS TABLE (
    plan subscription_plan,
    status subscription_status,
    current_period_end TIMESTAMP,
    cancel_at_period_end BOOLEAN,
    features JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.plan,
        s.status,
        s.current_period_end,
        s.cancel_at_period_end,
        to_jsonb(sf) - 'id' - 'plan' - 'created_at' - 'updated_at' as features
    FROM subscriptions s
    JOIN subscription_features sf ON s.plan = sf.plan
    WHERE s.user_id = p_user_id
        AND s.status = 'active'
    ORDER BY s.current_period_end DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ANALYTICS QUERIES
-- ============================================

-- Daily active users
CREATE OR REPLACE FUNCTION get_daily_active_users(p_date DATE DEFAULT CURRENT_DATE)
RETURNS INT AS $$
BEGIN
    RETURN (
        SELECT COUNT(DISTINCT user_id)
        FROM analytics_events
        WHERE DATE(created_at) = p_date
    );
END;
$$ LANGUAGE plpgsql;

-- Session statistics
CREATE OR REPLACE FUNCTION get_session_stats(
    p_start_date TIMESTAMP DEFAULT NOW() - INTERVAL '7 days',
    p_end_date TIMESTAMP DEFAULT NOW()
)
RETURNS TABLE (
    total_sessions BIGINT,
    avg_duration DECIMAL(10,2),
    extension_rate DECIMAL(5,2),
    report_rate DECIMAL(5,2),
    unique_users BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_sessions,
        AVG(duration_seconds) as avg_duration,
        (SUM(CASE WHEN extended THEN 1 ELSE 0 END)::DECIMAL / COUNT(*)) * 100 as extension_rate,
        (SUM(CASE WHEN was_reported THEN 1 ELSE 0 END)::DECIMAL / COUNT(*)) * 100 as report_rate,
        COUNT(DISTINCT user1_id) + COUNT(DISTINCT user2_id) as unique_users
    FROM video_sessions
    WHERE started_at BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql;
```

## 5. Scaling Considerations for Millions of Users

### Horizontal Partitioning Strategy

```sql
-- ============================================
-- TABLE PARTITIONING
-- ============================================

-- Partition video_sessions by month
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

-- Create monthly partitions
CREATE TABLE video_sessions_2024_01 PARTITION OF video_sessions
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE video_sessions_2024_02 PARTITION OF video_sessions
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
-- ... continue for each month

-- Partition analytics_events by day
CREATE TABLE analytics_events (
    id UUID,
    user_id UUID,
    event_type VARCHAR(50),
    event_data JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create daily partitions
CREATE TABLE analytics_events_2024_01_01 PARTITION OF analytics_events
    FOR VALUES FROM ('2024-01-01') TO ('2024-01-02');
```

### Read Replicas Configuration

```sql
-- Primary: Write operations
-- Replicas: Read operations (analytics, reporting, feeds)

-- Configure connection pooling with PgBouncer
-- Route writes to primary, reads to replicas

-- Example: Application-level routing
-- WRITE: users, video_sessions, reports
-- READ: match_history, moments, analytics
```

### Caching Strategy

```sql
-- Redis Cache Keys
-- User Profile: user:{id}:profile (TTL: 1 hour)
-- User Preferences: user:{id}:preferences (TTL: 24 hours)
-- Active Sessions: session:{id} (TTL: session duration + 5 min)
-- Match Queue: match:queue (List, no TTL)
-- Online Users: online:users (Set, TTL: 5 min)
-- Moments Feed: user:{id}:moments:feed (TTL: 10 min)
-- Friend List: user:{id}:friends (TTL: 1 hour)
-- Rate Limits: ratelimit:{identifier}:{action} (TTL: window)
```

### Connection Pooling

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  App Server  │     │  App Server  │     │  App Server  │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       └────────────────────┼────────────────────┘
                            │
                 ┌──────────▼──────────┐
                 │    PgBouncer Pool   │
                 │  (Transaction Mode) │
                 └──────────┬──────────┘
                            │
                 ┌──────────▼──────────┐
                 │   PostgreSQL Primary│
                 └─────────────────────┘
```

### Sharding Strategy (10M+ Users)

```sql
-- Shard by user_id hash
-- Shard 1: user_id % 4 = 0
-- Shard 2: user_id % 4 = 1
-- Shard 3: user_id % 4 = 2
-- Shard 4: user_id % 4 = 3

-- Cross-shard operations handled at application level
-- Use consistent hashing for user distribution
```

### Performance Targets

| Metric | Target | Strategy |
|--------|--------|----------|
| User lookup | < 10ms | Indexes + Redis cache |
| Match finding | < 100ms | Redis queue + pre-filtering |
| Session creation | < 50ms | Optimistic locking |
| Moment feed | < 200ms | Materialized views + CDN |
| Report processing | < 500ms | Async queue + batch processing |
| Analytics queries | < 2s | Read replicas + partitioning |

### Monitoring Queries

```sql
-- Database health checks
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) as size,
    n_live_tup as live_rows,
    n_dead_tup as dead_rows,
    last_vacuum,
    last_autovacuum
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC
LIMIT 20;

-- Index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC
LIMIT 20;

-- Long-running queries
SELECT 
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query,
    state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 seconds'
    AND state != 'idle'
ORDER BY duration DESC;

-- Connection count
SELECT 
    state,
    count(*)
FROM pg_stat_activity
GROUP BY state;
```
