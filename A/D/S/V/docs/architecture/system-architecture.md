# System Architecture - VideoChat Platform

## 1. Frontend Architecture

### Framework Choice: Next.js 14 (React)

**Why Next.js:**
- Server-side rendering for faster initial load
- App Router for better routing and layouts
- Built-in API routes for backend integration
- Excellent TypeScript support
- PWA capabilities for mobile-like experience
- Large ecosystem and community support

### State Management: Zustand + React Query

**Zustand** for client-side state:
```typescript
// Lightweight, no boilerplate, perfect for video chat state
interface ChatState {
  socket: Socket | null;
  status: ChatStatus;
  sessionId: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  // ... actions
}
```

**React Query** for server state:
- Automatic caching and refetching
- Optimistic updates for better UX
- Background synchronization

### Real-time Video Integration

**WebRTC Architecture:**
```
Browser (Client A) ←→ Signaling Server ←→ Browser (Client B)
       ↓                                        ↓
   STUN/TURN Server                      STUN/TURN Server
       ↓                                        ↓
   Direct P2P Connection (when possible)
```

**Implementation:**
- `simple-peer` for P2P WebRTC abstraction
- Custom signaling via Socket.IO
- Fallback to SFU (mediasoup) for scalability
- Canvas overlay for video filters

**Video Pipeline:**
```
Camera → MediaStream → WebRTC PeerConnection → Remote Peer
                ↓
         Video Filters (Canvas)
                ↓
         Local Preview
```

### Responsive Design Strategy

**Mobile-First Approach:**
```css
/* Tailwind breakpoints */
sm: 640px   /* phones */
md: 768px   /* tablets */
lg: 1024px  /* laptops */
xl: 1280px  /* desktops */
```

**Component Strategy:**
- Video grid adapts: 1 column (mobile) → 2 columns (desktop)
- Touch-friendly buttons (min 44px)
- Swipe gestures for mobile navigation
- PWA install prompt for app-like experience

**Layout Structure:**
```
┌─────────────────────────────────────┐
│           Header (fixed)            │
├─────────────────────────────────────┤
│                                     │
│         Video Container             │
│      (responsive aspect-ratio)      │
│                                     │
├─────────────────────────────────────┤
│        Controls (bottom bar)        │
└─────────────────────────────────────┘
```

---

## 2. Backend Architecture

### Server Framework: Node.js + Express

**Why Node.js:**
- Non-blocking I/O perfect for real-time apps
- Shared language with frontend (TypeScript)
- Excellent WebSocket support
- Large ecosystem for video/real-time libs

**Architecture Pattern:**
```
┌─────────────────────────────────────────────┐
│                API Gateway                   │
├──────────┬──────────┬──────────┬────────────┤
│  Auth    │  Users   │ Sessions │ Moderation │
│ Service  │ Service  │ Service  │  Service   │
├──────────┴──────────┴──────────┴────────────┤
│           Message Queue (Redis)              │
├─────────────────────────────────────────────┤
│         Database Layer (Prisma)              │
└─────────────────────────────────────────────┘
```

### WebRTC Implementation

**Signaling Flow:**
```
Client A                          Server                          Client B
   │                                │                                │
   │──── join_queue ───────────────▶│                                │
   │                                │──── match_found ──────────────▶│
   │◀─── match_found ───────────────│                                │
   │                                │                                │
   │──── createOffer ──────────────▶│                                │
   │                                │──── offer ────────────────────▶│
   │                                │                                │
   │                                │◀──── createAnswer ─────────────│
   │◀─── answer ────────────────────│                                │
   │                                │                                │
   │──── ICE Candidates ───────────▶│──── ICE Candidates ───────────▶│
   │                                │                                │
   │◀══════════ Direct P2P Connection ══════════════════════════════▶│
```

**SFU Fallback (for >1000 concurrent):**
```
Client A ──→ mediasoup SFU ──→ Client B
                ↓
         Router/Transport
                ↓
         Selective Forwarding
```

### Real-time Matching Algorithm

**Queue-based Matching:**
```typescript
interface MatchQueue {
  queue: RedisList;           // FIFO queue
  preferences: RedisHash;     // User preferences cache
  cooldown: RedisSet;         // Recently matched users
}

// Matching logic:
// 1. Pop user from queue
// 2. Find compatible match based on:
//    - Age range overlap
//    - Gender preferences
//    - Language match
//    - Not in cooldown period
// 3. Create session and notify both users
```

**Matching Priority:**
1. Premium users (priority queue)
2. Wait time (FIFO)
3. Preference compatibility score
4. Geographic proximity (optional)

### WebSocket Management

**Socket.IO Architecture:**
```
┌─────────────────────────────────────────┐
│          Socket.IO Server                │
├──────────┬──────────┬──────────┬────────┤
│  Rooms   │  Events  │  Auth    │ Scale  │
│          │          │ Middleware│ Adapter│
├──────────┴──────────┴──────────┴────────┤
│           Redis Adapter                  │
│    (for horizontal scaling)              │
└─────────────────────────────────────────┘
```

**Event Flow:**
```
User connects → Auth middleware → Join user room
       ↓
   Join queue → Match found → Create session
       ↓
   WebRTC signaling → Session active → Timer starts
       ↓
   Extend/Skip/Report → Session ends → Re-queue
```

**Scaling with Redis Adapter:**
```
Server A ←→ Redis Adapter ←→ Server B
    ↓                            ↓
  Users                        Users
```

---

## 3. Database Design

### Entity Relationship Diagram

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│    Users     │────▶│ UserPreferences  │     │   Moments    │
├──────────────┤     ├──────────────────┤     ├──────────────┤
│ id (PK)      │     │ id (PK)          │     │ id (PK)      │
│ email        │     │ user_id (FK)     │     │ user_id (FK) │
│ phone        │     │ preferred_gender │     │ media_url    │
│ password_hash│     │ age_range_min    │     │ media_type   │
│ display_name │     │ age_range_max    │     │ caption      │
│ age          │     │ languages        │     │ expires_at   │
│ gender       │     │ interests        │     │ created_at   │
│ avatar_url   │     └──────────────────┘     └──────────────┘
│ bio          │                                    │
│ is_verified  │                                    │
│ is_premium   │                                    │
│ status       │                                    │
│ created_at   │                                    │
│ updated_at   │                                    │
└──────┬───────┘                                    │
       │                                            │
       │         ┌──────────────┐                   │
       │         │   Friends    │                   │
       │         ├──────────────┤                   │
       └────────▶│ id (PK)      │                   │
                 │ user1_id(FK) │                   │
                 │ user2_id(FK) │                   │
                 │ status       │                   │
                 │ created_at   │                   │
                 └──────────────┘                   │
                                                    │
       ┌──────────────┐                             │
       │VideoSessions │                             │
       ├──────────────┤                             │
       │ id (PK)      │                             │
       │ user1_id(FK) │                             │
       │ user2_id(FK) │                             │
       │ status       │                             │
       │ started_at   │                             │
       │ ended_at     │                             │
       │ duration     │                             │
       │ extended     │                             │
       │ created_at   │                             │
       └──────┬───────┘                             │
              │                                     │
              │         ┌──────────────┐            │
              │         │   Reports    │            │
              │         ├──────────────┤            │
              └────────▶│ id (PK)      │            │
                        │ reporter_id  │            │
                        │ reported_id  │            │
                        │ session_id   │            │
                        │ reason       │            │
                        │ status       │            │
                        │ created_at   │            │
                        └──────────────┘            │
                                                    │
                                                    ▼
                                            ┌──────────────┐
                                            │    S3/CDN    │
                                            │  (Media)     │
                                            └──────────────┘
```

### Schema Details

**Users Table:**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20) UNIQUE,
  password_hash VARCHAR(255),
  display_name VARCHAR(50) NOT NULL,
  age INT CHECK (age >= 18),
  gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'non_binary', 'other')),
  avatar_url VARCHAR(500),
  bio TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_premium BOOLEAN DEFAULT false,
  premium_expires_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'offline',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Chat History Optimization:**
- Sessions stored with TTL in Redis for active sessions
- Historical data moved to PostgreSQL for analytics
- Partitioned by month for queries > 1M rows

**Moments/Stories:**
- Ephemeral: 24-hour TTL
- Stored in S3 with lifecycle policy
- Metadata in PostgreSQL with `expires_at`
- Cron job to clean expired records

**Friend Connections:**
- Bidirectional with status tracking
- Indexes on (user1_id, user2_id) for fast lookups
- Block list prevents matching

**Moderation Logs:**
- Immutable audit trail
- Linked to sessions and users
- Severity scoring for automated actions
- Human review queue integration

---

## 4. Infrastructure

### Complete Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Users (Web/Mobile)                          │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │    Cloudflare CDN    │
                    │  (Static + DDoS)     │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Load Balancer      │
                    │   (nginx/ALB)        │
                    └────┬──────────┬─────┘
                         │          │
              ┌──────────▼──┐    ┌──▼──────────┐
              │  Frontend   │    │   Backend    │
              │  (Next.js)  │    │  (Node.js)   │
              │  Server 1-3 │    │  Server 1-3  │
              └─────────────┘    └──────┬───────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
          ┌─────────▼────────┐ ┌───────▼──────┐ ┌─────────▼────────┐
          │   PostgreSQL     │ │    Redis     │ │   S3 Storage     │
          │   (Primary)      │ │   (Cache)    │ │   (Media)        │
          └──────────────────┘ └──────────────┘ └──────────────────┘
                    │                   │                   │
          ┌─────────▼────────┐                              │
          │   Read Replica   │                              │
          │   (Analytics)    │                              │
          └──────────────────┘                              │
                                                            │
          ┌─────────────────────────────────────────────────┘
          │
┌─────────▼──────────────────────────────────────────────────────────┐
│                    Video Infrastructure                             │
├──────────────────┬──────────────────┬──────────────────────────────┤
│   STUN Server    │   TURN Server    │   SFU (mediasoup)            │
│   (coturn)       │   (coturn)       │   (for scale >1000 users)    │
└──────────────────┴──────────────────┴──────────────────────────────┘
```

### Video Streaming Service Comparison

| Service | Cost | Latency | Scale | Customization |
|---------|------|---------|-------|---------------|
| **WebRTC P2P** | Free | ~50ms | ~100 concurrent | Full control |
| **mediasoup SFU** | Server cost | ~100ms | 10,000+ | Full control |
| **LiveKit** | $0.004/min | ~150ms | Auto-scale | SDK-based |
| **Twilio Video** | $0.004/min | ~200ms | Auto-scale | Limited |
| **Agora** | $0.0039/min | ~150ms | Auto-scale | SDK-based |

**Recommendation:** Start with P2P WebRTC, migrate to mediasoup SFU at scale.

### CDN Strategy

```
User Request → Cloudflare Edge → Cache Hit → Response
                      ↓
                Cache Miss → Origin Server → Cache → Response
```

**CDN Layers:**
1. **Static Assets:** Next.js build files, images, fonts
2. **Media:** S3-backed video/image delivery
3. **API:** Edge caching for non-real-time endpoints

### Scalable Server Architecture

**Horizontal Scaling:**
```
┌─────────────────────────────────────────────┐
│              Auto Scaling Group              │
├──────────┬──────────┬──────────┬────────────┤
│ Instance │ Instance │ Instance │ Instance   │
│   #1     │   #2     │   #3     │   #N       │
└──────────┴──────────┴──────────┴────────────┘
         ↓          ↓          ↓          ↓
┌─────────────────────────────────────────────┐
│           Shared State (Redis)               │
└─────────────────────────────────────────────┘
```

**Scaling Triggers:**
- CPU > 70% for 5 minutes
- WebSocket connections > 1000 per instance
- Memory > 80%

### Load Balancing Strategy

**Layer 7 Load Balancing:**
```
Client → ALB → Target Group → Healthy Instances
```

**Sticky Sessions for WebSockets:**
- Required for Socket.IO
- Use Redis adapter for cross-instance communication
- Health checks every 30 seconds

**Traffic Distribution:**
- Round-robin for API
- IP-hash for WebSocket connections
- Weighted for canary deployments

---

## 5. Security & Moderation

### Age Verification System

**Multi-layer Approach:**
```
┌─────────────────────────────────────────────┐
│           Age Verification Flow              │
├─────────────────────────────────────────────┤
│ 1. Self-declared age (18+) at registration  │
│ 2. Email/phone verification                  │
│ 3. Optional: ID verification (Veriff/Yoti)  │
│ 4. Behavioral analysis for suspicious users │
│ 5. Report-based re-verification              │
└─────────────────────────────────────────────┘
```

**Integration:**
```typescript
interface AgeVerification {
  method: 'self_declared' | 'id_verified' | 'behavioral';
  status: 'pending' | 'verified' | 'failed';
  verifiedAt: Date;
  provider?: 'veriff' | 'yoti' | 'internal';
}
```

### Content Moderation ML Integration

**Real-time Pipeline:**
```
Video Stream → Frame Extraction (1fps) → ML Model → Moderation Decision
                                              ↓
                                    ┌─────────┼─────────┐
                                    ↓         ↓         ↓
                               Safe (80%)  Review (15%)  Block (5%)
                                    ↓         ↓         ↓
                               Continue   Queue for   Auto-ban
                                          Human       + Evidence
```

**ML Models:**
- **AWS Rekognition:** Image/video moderation
- **OpenAI Moderation API:** Text content
- **Custom Model:** Behavioral patterns
- **Hive Moderation:** Specialized content detection

**Moderation API Integration:**
```typescript
interface ModerationResult {
  video: {
    explicit: number;    // 0-1 score
    violent: number;
    suggestive: number;
  };
  audio: {
    profanity: number;
    harassment: number;
  };
  action: 'allow' | 'review' | 'block';
  confidence: number;
}
```

### Report Handling Workflow

```
User Report → Auto-categorize → Severity Score → Action
     ↓                              ↓              ↓
 Evidence Capture              ML Analysis     Immediate:
 (screenshot)                  + Human Review   - Warning
                                              - Temporary ban
                                              - Permanent ban
                                                    ↓
                                              Appeal Process
                                                    ↓
                                              Moderator Review
```

**Severity Scoring:**
```typescript
const severityScores = {
  inappropriate: 3,
  harassment: 4,
  underage: 5,      // Immediate ban
  spam: 2,
  hate_speech: 5,   // Immediate ban
};

// Accumulative system:
// 0-5: Warning
// 6-10: 24h ban
// 11-15: 7d ban
// 16+: Permanent ban
```

### Data Encryption Standards

**In Transit:**
- TLS 1.3 for all HTTP/WebSocket connections
- DTLS-SRTP for WebRTC media streams
- Certificate pinning for mobile apps

**At Rest:**
- AES-256 encryption for database
- S3 server-side encryption (SSE-S3)
- Encrypted backups with KMS

**Sensitive Data:**
```
Password → bcrypt (cost factor 12)
PII → Field-level encryption
Payment → Stripe (PCI compliant)
Tokens → JWT with short expiry
```

**Security Headers:**
```
Strict-Transport-Security: max-age=31536000
Content-Security-Policy: default-src 'self'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

---

## Deployment Architecture

### AWS Infrastructure

```
┌─────────────────────────────────────────────────────────────────┐
│                        Route 53 (DNS)                            │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                     CloudFront (CDN)                             │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                  Application Load Balancer                       │
└────┬─────────────────┬─────────────────┬────────────────────────┘
     │                 │                 │
┌────▼────┐     ┌──────▼──────┐   ┌─────▼─────┐
│ ECS     │     │ ECS         │   │ ECS       │
│ Task #1 │     │ Task #2     │   │ Task #N   │
│ (FE+BE) │     │ (FE+BE)     │   │ (FE+BE)   │
└────┬────┘     └──────┬──────┘   └─────┬─────┘
     │                 │                 │
┌────▼─────────────────▼─────────────────▼─────┐
│                VPC Internal                   │
├─────────────┬───────────────┬────────────────┤
│ RDS         │ ElastiCache   │ S3             │
│ PostgreSQL  │ Redis         │ Media Storage  │
└─────────────┴───────────────┴────────────────┘
```

### Monitoring & Observability

```
┌─────────────────────────────────────────────┐
│              Observability Stack             │
├──────────┬──────────┬──────────┬────────────┤
│ Metrics  │ Logs     │ Traces   │ Alerts     │
│ (Prom)   │ (Loki)   │ (Jaeger) │ (PagerDuty)│
├──────────┴──────────┴──────────┴────────────┤
│              Grafana Dashboards              │
└─────────────────────────────────────────────┘
```

**Key Metrics:**
- Concurrent users
- Match success rate
- Average session duration
- Video quality (bitrate, packet loss)
- Moderation actions
- Error rates

---

## Cost Estimation (10k MAU)

| Component | Service | Monthly Cost |
|-----------|---------|--------------|
| Compute | ECS Fargate (3 tasks) | $150 |
| Database | RDS PostgreSQL (db.t3.medium) | $50 |
| Cache | ElastiCache Redis (cache.t3.micro) | $15 |
| Storage | S3 (100GB) | $2.50 |
| CDN | CloudFront (1TB) | $85 |
| TURN | coturn (self-hosted) | $20 |
| Monitoring | Grafana Cloud (free tier) | $0 |
| Moderation | AWS Rekognition (10k images) | $10 |
| **Total** | | **~$332.50/mo** |
