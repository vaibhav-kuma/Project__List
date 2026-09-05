# VideoChat Platform - Architecture Overview

## System Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  Web Browser │  │  Mobile App  │  │  Mobile App  │  │  Desktop App │    │
│  │  (Next.js)   │  │  (iOS)       │  │  (Android)   │  │  (Electron)  │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
└─────────┼─────────────────┼─────────────────┼─────────────────┼─────────────┘
          │                 │                 │                 │
          └─────────────────┴────────┬────────┴─────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────────┐
│                            EDGE LAYER                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        Cloudflare CDN                                 │   │
│  │  • Static asset caching  • DDoS protection  • WAF  • Rate limiting  │   │
│  └──────────────────────────────┬───────────────────────────────────────┘   │
│                                 │                                            │
│  ┌──────────────────────────────▼───────────────────────────────────────┐   │
│  │                    Application Load Balancer                          │   │
│  │  • Health checks  • Sticky sessions  • SSL termination  • Routing   │   │
│  └──────────────────────────────┬───────────────────────────────────────┘   │
└─────────────────────────────────┼───────────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────────────┐
│                          APPLICATION LAYER                                   │
│                                                                              │
│  ┌─────────────────────────┐              ┌─────────────────────────┐       │
│  │    Frontend Servers     │              │    Backend Servers      │       │
│  │    (Next.js SSR)        │              │    (Node.js + Express)  │       │
│  │                         │              │                         │       │
│  │  • Page rendering       │◄────────────►│  • REST API             │       │
│  │  • API routes           │   HTTP/WS    │  • WebSocket server     │       │
│  │  • Static assets        │              │  • Business logic       │       │
│  │  • PWA support          │              │  • Real-time matching   │       │
│  └─────────────────────────┘              └────────────┬────────────┘       │
│                                                        │                    │
└────────────────────────────────────────────────────────┼────────────────────┘
                                                         │
┌────────────────────────────────────────────────────────▼────────────────────┐
│                            DATA LAYER                                        │
│                                                                              │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐  │
│  │    PostgreSQL       │  │      Redis          │  │    S3 Storage       │  │
│  │                     │  │                     │  │                     │  │
│  │  • User data        │  │  • Session cache    │  │  • User avatars     │  │
│  │  • Chat history     │  │  • Match queue      │  │  • Moments/stories  │  │
│  │  • Friend relations │  │  • Rate limiting    │  │  • Report evidence  │  │
│  │  • Reports          │  │  • Pub/Sub          │  │  • Moderation logs  │  │
│  │  • Subscriptions    │  │  • Real-time state  │  │  • Backups          │  │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────────────┐
│                        VIDEO INFRASTRUCTURE                                  │
│                                                                              │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐  │
│  │   STUN Server       │  │   TURN Server       │  │   SFU (mediasoup)   │  │
│  │   (coturn)          │  │   (coturn)          │  │                     │  │
│  │                     │  │                     │  │  • Scalable video   │  │
│  │  • NAT traversal    │  │  • Relay fallback   │  │  • Selective fwd    │  │
│  │  • Peer discovery   │  │  • Firewall bypass  │  │  • Recording        │  │
│  │                     │  │                     │  │  • Transcoding      │  │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────────────┐
│                        EXTERNAL SERVICES                                     │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │    Stripe    │  │  AWS Rekog.  │  │  SendGrid    │  │  Twilio SMS  │    │
│  │  Payments    │  │  Moderation  │  │  Email       │  │  Verify      │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Component Roles

### Frontend (Next.js)
- **Server-Side Rendering**: Fast initial page loads, SEO optimization
- **Client-Side Routing**: Smooth navigation between pages
- **PWA Support**: Installable on mobile devices, offline fallback
- **WebRTC Integration**: Camera/microphone access, video rendering
- **State Management**: Zustand for local state, React Query for server data

### Backend (Node.js + Express)
- **REST API**: User authentication, profile management, reporting
- **WebSocket Server**: Real-time communication, match signaling
- **Matching Engine**: Queue-based algorithm with preference filtering
- **Session Management**: 15-second timer, extend logic, cleanup
- **Moderation Integration**: ML API calls, report processing

### Database (PostgreSQL)
- **Primary Data Store**: Users, sessions, friends, reports
- **Relational Integrity**: Foreign keys, constraints, transactions
- **Analytics**: Historical data, user behavior, metrics
- **Audit Trail**: Immutable logs for compliance

### Cache (Redis)
- **Match Queue**: Fast FIFO operations for user matching
- **Session State**: Active sessions, timers, extend requests
- **Rate Limiting**: API throttling, abuse prevention
- **Pub/Sub**: Cross-instance WebSocket communication

### Storage (S3)
- **User Media**: Avatars, profile photos
- **Moments**: Ephemeral stories with 24-hour lifecycle
- **Evidence**: Report screenshots, moderation logs
- **Backups**: Database snapshots, disaster recovery

### Video Infrastructure
- **STUN**: NAT traversal for direct P2P connections
- **TURN**: Relay for restricted networks (firewalls, symmetric NAT)
- **SFU**: Selective Forwarding Unit for large-scale deployments

## Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Stack                            │
├─────────────────────────────────────────────────────────────┤
│  Layer 1: Cloudflare WAF + DDoS Protection                  │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: Rate Limiting + IP Blocking                       │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: JWT Authentication + Authorization                │
├─────────────────────────────────────────────────────────────┤
│  Layer 4: Input Validation (Zod) + SQL Injection Prevention │
├─────────────────────────────────────────────────────────────┤
│  Layer 5: TLS 1.3 Encryption (HTTPS/WSS)                    │
├─────────────────────────────────────────────────────────────┤
│  Layer 6: DTLS-SRTP for WebRTC Media                        │
├─────────────────────────────────────────────────────────────┤
│  Layer 7: Content Moderation (ML + Human)                   │
├─────────────────────────────────────────────────────────────┤
│  Layer 8: Age Verification + Identity Checks                │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow Summary

1. **User Registration**: Client → API → Validate → Hash Password → Store in DB → JWT
2. **Video Match**: Client → WS → Queue → Match Algorithm → Notify Both → WebRTC Setup
3. **Session Flow**: Connect → 15s Timer → Extend/Skip → End → Report → Re-queue
4. **Moderation**: Stream → Frame Extract → ML Analysis → Score → Action (Allow/Review/Block)
5. **Moments**: Upload → S3 → Store Metadata → 24h TTL → Auto-delete
