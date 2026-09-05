# Video Chat Implementation Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  WebRTC     │  │  Socket.IO   │  │  UI Components       │   │
│  │  Service    │  │  Client      │  │  - VideoControls     │   │
│  │  (P2P)      │◄─┤  (Signaling) │◄─┤  - SessionTimer      │   │
│  │             │  │              │  │  - MatchOverlay      │   │
│  └──────┬──────┘  └──────┬───────┘  │  - ExtendPrompt      │   │
│         │                │          │  - VideoFilters      │   │
│         │                │          │  - ConnectionQuality │   │
│         ▼                ▼          └──────────────────────┘   │
└─────────┼────────────────┼─────────────────────────────────────┘
          │                │
          │  WebRTC Data   │  WebSocket
          │  (Video/Audio) │  (Signaling)
          │                │
┌─────────▼────────────────▼─────────────────────────────────────┐
│                        Backend (Node.js)                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────────────────────┐   │
│  │  Matching        │  │  Socket.IO Server                │   │
│  │  Service         │  │  - Signal relay                  │   │
│  │  - Queue mgmt    │  │  - Session mgmt                  │   │
│  │  - Preference    │  │  - Extend logic                  │   │
│  │    filtering     │  │  - Report handling               │   │
│  └──────────────────┘  └──────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────────────────────┐   │
│  │  Redis           │  │  PostgreSQL                      │   │
│  │  - Match queue   │  │  - Session records               │   │
│  │  - User status   │  │  - Match history                 │   │
│  │  - Session state │  │  - User profiles                 │   │
│  └──────────────────┘  └──────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## WebRTC Connection Flow

```
User A                          Server                          User B
  │                                │                                │
  │── Initialize camera ──────────▶│                                │
  │── Create PeerConnection ──────▶│                                │
  │                                │                                │
  │── Join match queue ───────────▶│                                │
  │                                │◀── Join match queue ───────────│
  │                                │                                │
  │                                │── Match found! ───────────────▶│
  │◀── Match found! ───────────────│                                │
  │                                │                                │
  │── Create Offer ───────────────▶│                                │
  │                                │── Forward Offer ──────────────▶│
  │                                │                                │
  │                                │── Create Answer ──────────────▶│
  │                                │◀── Forward Answer ─────────────│
  │◀── Receive Answer ─────────────│                                │
  │                                │                                │
  │── ICE Candidates ─────────────▶│── Forward ICE ────────────────▶│
  │◀── ICE Candidates ─────────────│◀── ICE Candidates ─────────────│
  │                                │                                │
  │◀═══════════ Direct P2P Connection ════════════════════════════▶│
  │                  (Video + Audio)                                │
  │                                │                                │
  │── 15s Timer ──────────────────▶│◀── 15s Timer ─────────────────│
  │                                │                                │
  │── Request Extend ─────────────▶│◀── Request Extend ────────────│
  │                                │── Both agreed! ───────────────▶│
  │◀── Extended! ──────────────────│                                │
  │                  (+15 seconds)                                  │
  │                                │                                │
  │── End Session ────────────────▶│── Session ended ──────────────▶│
  │◀── Session ended ──────────────│                                │
  │                                │                                │
  │── Re-join queue ──────────────▶│◀── Re-join queue ─────────────│
```

## File Structure

```
frontend/src/
├── lib/
│   └── webrtc.ts                      # WebRTC service class
├── hooks/
│   └── useWebRTCChat.ts               # WebRTC React hook
├── store/
│   ├── chatSocket.ts                  # Socket.IO state management
│   └── videoChatStore.ts             # Video chat state (alternative)
├── app/
│   └── video-chat/
│       └── page.tsx                   # Main video chat page
└── components/
    └── chat/
        ├── VideoControls.tsx          # Mute, camera, next, extend buttons
        ├── MatchOverlay.tsx           # Searching animation
        ├── SessionTimer.tsx           # Circular countdown timer
        ├── ExtendPrompt.tsx           # Extend chat prompt
        ├── ConnectionQuality.tsx      # Signal strength indicator
        └── VideoFilters.tsx           # Filter selection panel

backend/src/
├── services/
│   ├── matchingService.ts            # Match queue + algorithm
│   └── socketService.ts              # WebSocket handler
└── routes/
    └── users.ts                       # User lookup endpoint
```

## Matching Algorithm

### Queue-Based Matching

```typescript
interface MatchPreferences {
  ageMin: number;        // Minimum age preference
  ageMax: number;        // Maximum age preference
  genders: string[];     // Preferred genders (empty = all)
  languages: string[];   // Preferred languages
}
```

### Matching Logic

1. **User joins queue** with preferences
2. **Match loop** runs every 1 second:
   - Iterate through queued users
   - Find compatible match based on:
     - Age range overlap
     - Gender preferences
     - Not in cooldown (30 min)
     - Not currently in session
3. **Create session** when match found
4. **Notify both users** via WebSocket
5. **WebRTC negotiation** begins

### Cooldown System

```typescript
// Prevent matching same users within 30 minutes
private matchCooldowns: Map<string, Set<string>> = new Map();

private addToCooldown(userId1: string, userId2: string): void {
  // Add to cooldown sets
  // Auto-remove after 30 minutes
}
```

## WebRTC Service

### Key Methods

| Method | Description |
|--------|-------------|
| `initializeLocalStream()` | Get camera/mic access |
| `createPeerConnection()` | Setup RTCPeerConnection |
| `createOffer()` | Create SDP offer |
| `handleOffer()` | Process incoming offer, create answer |
| `handleAnswer()` | Process incoming answer |
| `handleIceCandidate()` | Add ICE candidate |
| `muteAudio()` / `unmuteAudio()` | Toggle audio |
| `toggleCamera()` | Toggle video |
| `switchCamera()` | Front/back camera switch |
| `getStats()` | Get connection statistics |
| `close()` | Cleanup all resources |

### Connection States

```
new → connecting → connected → (disconnected/failed/closed)
```

### Statistics Tracked

- **Bitrate** (kbps)
- **Packet loss** (count)
- **Jitter** (ms)
- **Resolution** (WxH)
- **FPS** (frames per second)
- **Latency** (ms)

## Timer Implementation

```typescript
// 15-second countdown with circular progress
const TIMER_DURATION = 15;

// Timer starts when session status = 'connected'
// Counts down every second
// At 0: auto-end session (unless extended)

// Extension logic:
// 1. User A clicks "Extend"
// 2. User B sees prompt
// 3. User B clicks "Accept"
// 4. Timer resets to 15 seconds
// 5. Both users notified
```

## Video Filters

| Filter | CSS Filter |
|--------|-----------|
| Normal | `''` |
| Beauty | `blur(1px) saturate(1.2) brightness(1.15) contrast(1.05)` |
| Blur | `blur(3px)` |
| Warm | `saturate(1.5) brightness(1.1)` |
| Cool | `saturate(0.8) hue-rotate(180deg)` |
| Grayscale | `grayscale(100%)` |
| Sepia | `sepia(100%)` |
| Vintage | `sepia(50%) contrast(1.1) brightness(0.9)` |
| Dramatic | `contrast(1.5) brightness(0.8) saturate(0.7)` |
| Neon | `saturate(2) hue-rotate(90deg) brightness(1.2)` |

## Error Handling

### Connection Errors

| Error | Handling |
|-------|----------|
| Camera denied | Show permission prompt, retry button |
| ICE failed | Auto-find new match after 2s |
| Signaling error | Log error, continue session |
| Network drop | Show reconnecting, auto-rejoin queue |

### Recovery Flow

```
Connection Failed
       ↓
Show error message
       ↓
Wait 2 seconds
       ↓
Cleanup WebRTC
       ↓
Re-initialize camera
       ↓
Re-join match queue
       ↓
Find new match
```

## Security Considerations

1. **STUN/TURN servers** configured for NAT traversal
2. **DTLS-SRTP** encryption for media streams
3. **Token-based authentication** for WebSocket
4. **Rate limiting** on signaling messages
5. **Session timeout** after inactivity

## Performance Optimization

1. **Simulcast** for adaptive quality (future)
2. **ICE trickle** for faster connection
3. **Connection stats** monitoring every 2s
4. **Lazy loading** of video elements
5. **Canvas-based filters** for GPU acceleration

## Testing Checklist

- [ ] Camera/mic permission handling
- [ ] WebRTC connection establishment
- [ ] Audio mute/unmute
- [ ] Camera toggle on/off
- [ ] Front/back camera switch
- [ ] 15-second timer countdown
- [ ] Extend flow (both users)
- [ ] Next/skip to new match
- [ ] Video filters application
- [ ] Connection quality display
- [ ] Error recovery
- [ ] Queue position display
- [ ] Match overlay animation
- [ ] Session cleanup on disconnect
