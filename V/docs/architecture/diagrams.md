# Architecture Diagrams

## 1. High-Level System Architecture

```mermaid
graph TB
    subgraph Users
        WA[Web App]
        MA[Mobile App]
    end

    subgraph Edge
        CF[Cloudflare CDN]
        LB[Load Balancer]
    end

    subgraph Frontend Tier
        FE1[Next.js Server 1]
        FE2[Next.js Server 2]
        FE3[Next.js Server 3]
    end

    subgraph Backend Tier
        BE1[Node.js Server 1]
        BE2[Node.js Server 2]
        BE3[Node.js Server 3]
    end

    subgraph Data Layer
        PG[(PostgreSQL)]
        RD[(Redis)]
        S3[(S3 Storage)]
    end

    subgraph Video Infrastructure
        STUN[STUN Server]
        TURN[TURN Server]
        SFU[mediasoup SFU]
    end

    subgraph External Services
        STRIPE[Stripe]
        MODERATION[ML Moderation API]
        EMAIL[Email Service]
    end

    WA --> CF
    MA --> CF
    CF --> LB
    LB --> FE1
    LB --> FE2
    LB --> FE3
    FE1 --> BE1
    FE2 --> BE2
    FE3 --> BE3
    BE1 --> PG
    BE2 --> PG
    BE3 --> PG
    BE1 --> RD
    BE2 --> RD
    BE3 --> RD
    BE1 --> S3
    BE2 --> S3
    BE3 --> S3
    BE1 -.-> STUN
    BE2 -.-> STUN
    BE3 -.-> STUN
    BE1 -.-> TURN
    BE2 -.-> TURN
    BE3 -.-> TURN
    BE1 -.-> SFU
    BE2 -.-> SFU
    BE3 -.-> SFU
    BE1 --> STRIPE
    BE1 --> MODERATION
    BE1 --> EMAIL
```

## 2. WebRTC Signaling Flow

```mermaid
sequenceDiagram
    participant A as User A
    participant S as Signaling Server
    participant B as User B
    participant T as TURN Server

    A->>S: Join Queue
    B->>S: Join Queue
    S->>S: Match Algorithm
    S->>A: Match Found (sessionId)
    S->>B: Match Found (sessionId)
    
    A->>A: Create PeerConnection
    A->>A: Create Offer
    A->>S: Send Offer
    S->>B: Forward Offer
    B->>B: Create PeerConnection
    B->>B: Create Answer
    B->>S: Send Answer
    S->>A: Forward Answer
    
    A->>T: ICE Candidate Gathering
    B->>T: ICE Candidate Gathering
    A->>S: ICE Candidates
    S->>B: Forward ICE
    B->>S: ICE Candidates
    S->>A: Forward ICE
    
    A->>T: P2P Connection Attempt
    B->>T: P2P Connection Attempt
    A-->>B: Direct Media Stream
    B-->>A: Direct Media Stream
    
    Note over A,B: 15-second timer starts
    A->>S: Request Extend
    B->>S: Request Extend
    S->>A: Session Extended
    S->>B: Session Extended
    Note over A,B: +15 seconds added
    
    A->>S: End Session
    S->>B: Session Ended
    S->>S: Clean up resources
```

## 3. Matching Algorithm Flow

```mermaid
flowchart TD
    A[User Joins Queue] --> B{Check Preferences}
    B -->|Age Range| C[Filter by Age]
    B -->|Gender| D[Filter by Gender]
    B -->|Language| E[Filter by Language]
    
    C --> F[Compatible Users Pool]
    D --> F
    E --> F
    
    F --> G{Check Cooldown}
    G -->|Recently Matched| H[Exclude from Pool]
    G -->|Not in Cooldown| I[Add to Candidates]
    
    H --> I
    I --> J{Premium User?}
    J -->|Yes| K[Priority Queue]
    J -->|No| L[Standard Queue]
    
    K --> M[Match Score Calculation]
    L --> M
    
    M --> N{Score > Threshold?}
    N -->|Yes| O[Create Session]
    N -->|No| P[Wait for Better Match]
    
    O --> Q[Notify Both Users]
    P --> R[Timeout = 30s]
    R --> S[Relax Criteria]
    S --> M
```

## 4. Database Schema Relationships

```mermaid
erDiagram
    USERS ||--o| USER_PREFERENCES : has
    USERS ||--o{ VIDEO_SESSIONS : participates
    USERS ||--o{ FRIENDS : has
    USERS ||--o{ MOMENTS : creates
    USERS ||--o{ REPORTS : makes
    USERS ||--o{ REPORTS : receives
    USERS ||--o{ MODERATION_ACTIONS : subject_to
    USERS ||--o{ SUBSCRIPTIONS : has
    USERS ||--o{ MATCH_HISTORY : has
    
    VIDEO_SESSIONS ||--o{ REPORTS : generates
    
    USERS {
        uuid id PK
        string email
        string phone
        string password_hash
        string display_name
        int age
        string gender
        string avatar_url
        string bio
        boolean is_verified
        boolean is_premium
        timestamp created_at
    }
    
    USER_PREFERENCES {
        uuid id PK
        uuid user_id FK
        string[] preferred_gender
        int age_range_min
        int age_range_max
        string[] languages
        string[] interests
    }
    
    VIDEO_SESSIONS {
        uuid id PK
        uuid user1_id FK
        uuid user2_id FK
        string status
        timestamp started_at
        timestamp ended_at
        int duration
        boolean extended
    }
    
    FRIENDS {
        uuid id PK
        uuid user1_id FK
        uuid user2_id FK
        string status
        timestamp created_at
    }
    
    MOMENTS {
        uuid id PK
        uuid user_id FK
        string media_url
        string media_type
        string caption
        timestamp expires_at
    }
    
    REPORTS {
        uuid id PK
        uuid reporter_id FK
        uuid reported_user_id FK
        uuid session_id FK
        string reason
        string status
        timestamp created_at
    }
```

## 5. Content Moderation Pipeline

```mermaid
flowchart LR
    subgraph Real-time Moderation
        A[Video Stream] --> B[Frame Extraction 1fps]
        B --> C[ML Model Analysis]
        C --> D{Score > 0.8?}
        D -->|Yes| E[Auto-Block Session]
        D -->|0.5-0.8| F[Queue for Review]
        D -->|< 0.5| G[Allow Continue]
    end
    
    subgraph Human Review
        F --> H[Moderator Dashboard]
        H --> I{Human Decision}
        I -->|Violation| J[Ban User + Evidence]
        I -->|False Positive| K[Clear + Log]
    end
    
    subgraph Post-Session
        E --> L[Store Evidence S3]
        J --> L
        L --> M[Update User Severity Score]
        M --> N{Score > Threshold?}
        N -->|Yes| O[Escalate Action]
        N -->|No| P[Log and Continue]
    end
```

## 6. WebSocket Scaling Architecture

```mermaid
graph TB
    subgraph Client Layer
        C1[Client 1]
        C2[Client 2]
        C3[Client N]
    end

    subgraph Server Layer
        S1[Socket Server 1]
        S2[Socket Server 2]
        S3[Socket Server 3]
    end

    subgraph Redis Adapter
        RA[Redis Pub/Sub]
        RS[Redis State]
    end

    C1 --> S1
    C2 --> S2
    C3 --> S3
    
    S1 <--> RA
    S2 <--> RA
    S3 <--> RA
    
    S1 <--> RS
    S2 <--> RS
    S3 <--> RS
    
    RA -. Broadcast .-> S1
    RA -. Broadcast .-> S2
    RA -. Broadcast .-> S3
```

## 7. Deployment Pipeline

```mermaid
flowchart LR
    A[Developer Push] --> B[GitHub Actions]
    B --> C{Run Tests}
    C -->|Pass| D[Build Docker Images]
    C -->|Fail| E[Notify Developer]
    D --> F[Push to ECR]
    F --> G[Deploy to Staging]
    G --> H[Run Integration Tests]
    H -->|Pass| I[Manual Approval]
    H -->|Fail| J[Rollback]
    I --> K[Deploy to Production]
    K --> L[Health Checks]
    L -->|Healthy| M[Update DNS]
    L -->|Unhealthy| N[Auto Rollback]
```

## 8. Infrastructure Cost Breakdown

```mermaid
pie title Monthly Cost Distribution (10k MAU)
    "Compute (ECS)" : 150
    "Database (RDS)" : 50
    "CDN (CloudFront)" : 85
    "Cache (Redis)" : 15
    "Storage (S3)" : 2.5
    "TURN Server" : 20
    "Moderation API" : 10
```
