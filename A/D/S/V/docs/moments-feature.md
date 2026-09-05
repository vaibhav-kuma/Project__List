# Moments Feature - Complete Implementation

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Moments System                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │                    Frontend (Next.js)                          │   │
│  ├───────────────────────────────────────────────────────────────┤   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐  │   │
│  │  │ Moments     │  │ Story        │  │ Create Moment        │  │   │
│  │  │ Feed Page   │  │ Viewer       │  │ Modal                │  │   │
│  │  │ - Friends   │  │ - Swipeable  │  │ - File selection     │  │   │
│  │  │ - Discover  │  │ - Progress   │  │ - Filters            │  │   │
│  │  │             │  │ - Like/Reply │  │ - Stickers           │  │   │
│  │  └──────┬──────┘  └──────┬───────┘  └──────────┬───────────┘  │   │
│  │         │                │                      │              │   │
│  │  ┌──────▼────────────────▼──────────────────────▼──────────┐  │   │
│  │  │              momentsStore (Zustand)                      │  │   │
│  │  │  - fetchFeed/fetchDiscover                              │  │   │
│  │  │  - createMoment/viewMoment/likeMoment                   │  │   │
│  │  │  - getUploadUrl (S3 presigned)                          │  │   │
│  │  └─────────────────────────────────────────────────────────┘  │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                ↑↓                                      │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │                    Backend (Node.js)                           │   │
│  ├───────────────────────────────────────────────────────────────┤   │
│  │  ┌─────────────────────────────────────────────────────────┐  │   │
│  │  │              momentController.ts                         │  │   │
│  │  │  - createMoment()     - Create with filters/stickers     │  │   │
│  │  │  - getMomentsFeed()   - Friends' moments                │  │   │
│  │  │  - getDiscover()      - Popular public moments           │  │   │
│  │  │  - viewMoment()       - Track views                     │  │   │
│  │  │  - likeMoment()       - Toggle like                     │  │   │
│  │  │  - replyToMoment()    - Add reply                       │  │   │
│  │  │  - getMomentViews()   - Viewers list                    │  │   │
│  │  │  - deleteMoment()     - Delete + S3 cleanup             │  │   │
│  │  └─────────────────────────────────────────────────────────┘  │   │
│  │                                                                 │   │
│  │  ┌─────────────────────────────────────────────────────────┐  │   │
│  │  │              uploadService.ts                            │  │   │
│  │  │  - getPresignedUrl()  - S3 signed URLs                  │  │   │
│  │  │  - deleteFile()       - Remove from S3                  │  │   │
│  │  │  - cleanupExpired()   - Batch delete                    │  │   │
│  │  └─────────────────────────────────────────────────────────┘  │   │
│  │                                                                 │   │
│  │  ┌─────────────────────────────────────────────────────────┐  │   │
│  │  │              momentCleanupService.ts                     │  │   │
│  │  │  - runCleanup()       - Hourly expired moment cleanup    │  │   │
│  │  │  - markExpired()      - Mark expired in DB              │  │   │
│  │  │  - cleanupOldViews()  - Clean old view records           │  │   │
│  │  │  - cleanupOldReplies() - Clean old replies               │  │   │
│  │  └─────────────────────────────────────────────────────────┘  │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                ↑↓                                      │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │              AWS S3 + CDN                                      │   │
│  ├───────────────────────────────────────────────────────────────┤   │
│  │  moments/images/{userId}/{timestamp}_{id}.{ext}               │   │
│  │  moments/videos/{userId}/{timestamp}_{id}.{ext}               │   │
│  │  moments/videos/{userId}/{timestamp}_{id}_thumb.jpg           │   │
│  │  avatars/{userId}/{timestamp}.{ext}                           │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                ↑↓                                      │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │              PostgreSQL                                        │   │
│  ├───────────────────────────────────────────────────────────────┤   │
│  │  moments          - Moment records with 24h TTL               │   │
│  │  moment_views     - View tracking                             │   │
│  │  moment_likes     - Like tracking                             │   │
│  │  moment_replies   - Reply tracking                            │   │
│  └───────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## API Endpoints

### Moments (`/api/moments`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/` | Create moment | Required |
| GET | `/feed` | Get friends' moments feed | Required |
| GET | `/discover` | Get popular public moments | Required |
| GET | `/user/:userId` | Get user's moments | Public* |
| GET | `/:momentId` | Get moment by ID | Public* |
| POST | `/:momentId/view` | Record view | Required |
| POST | `/:momentId/like` | Toggle like | Required |
| POST | `/:momentId/reply` | Add reply | Required |
| GET | `/:momentId/views` | Get viewers list | Owner only |
| PUT | `/:momentId` | Update moment | Owner only |
| DELETE | `/:momentId` | Delete moment | Owner only |

### Upload (`/api/upload`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/moment` | Get presigned upload URL | Required |
| POST | `/avatar` | Update avatar URL | Required |

## Create Moment Request

```json
{
  "mediaUrl": "https://cdn.example.com/moments/images/user123/1234567890_abc123.jpg",
  "mediaPublicId": "moments/images/user123/1234567890_abc123.jpg",
  "mediaType": "image",
  "caption": "Having a great day! ☀️",
  "durationSeconds": null,
  "width": 1080,
  "height": 1920,
  "fileSize": 245678,
  "visibility": "friends",
  "filters": ["warm"],
  "stickers": [
    { "type": "heart", "emoji": "❤️", "x": 50, "y": 30 },
    { "type": "sun", "emoji": "☀️", "x": 80, "y": 20 }
  ]
}
```

## Upload Flow

```
Client                          Server                          S3
  │                                │                                │
  │── POST /upload/moment ────────▶│                                │
  │   { fileName, contentType }    │                                │
  │                                │── Generate presigned URL ─────▶│
  │                                │◀── Upload URL ─────────────────│
  │◀── { uploadUrl, publicUrl } ───│                                │
  │                                │                                │
  │── PUT uploadUrl ──────────────────────────────────────────────▶│
  │   (file data)                  │                                │
  │                                │◀── Upload complete ────────────│
  │                                │                                │
  │── POST /moments ──────────────▶│                                │
  │   { mediaUrl, caption, ... }   │                                │
  │                                │── Create moment in DB          │
  │                                │   expiresAt = now + 24h        │
  │◀── { moment } ─────────────────│                                │
```

## Storage Structure

```
s3://videochat-media/
├── moments/
│   ├── images/
│   │   └── {userId}/
│   │       └── {timestamp}_{uuid}.{ext}
│   └── videos/
│       └── {userId}/
│           ├── {timestamp}_{uuid}.{ext}
│           └── {timestamp}_{uuid}_thumb.jpg
└── avatars/
    └── {userId}/
        └── {timestamp}.{ext}
```

## Automated Cleanup

### Schedule
- **Every hour**: Run cleanup job
- **Process**:
  1. Find moments where `expiresAt < NOW()` or `isExpired = true`
  2. Delete media files from S3
  3. Delete moment records from database
  4. Clean up old views (> 7 days)
  5. Clean up old replies (> 7 days)

### Cleanup Service

```typescript
class MomentCleanupService {
  start(): void {
    this.runCleanup();
    setInterval(() => this.runCleanup(), 60 * 60 * 1000); // Every hour
  }

  async runCleanup(): Promise<{ expired: number; deleted: number; errors: number }> {
    // 1. Find expired moments
    // 2. Delete from S3
    // 3. Delete from DB
    // 4. Clean old views/replies
  }
}
```

## Video Filters

| Filter | CSS | Description |
|--------|-----|-------------|
| Normal | `''` | No filter |
| Beauty | `blur(1px) saturate(1.2) brightness(1.15)` | Smooth + vibrant |
| Warm | `saturate(1.5) brightness(1.1)` | Warm tones |
| Cool | `saturate(0.8) hue-rotate(180deg)` | Cool tones |
| Vintage | `sepia(50%) contrast(1.1) brightness(0.9)` | Retro look |
| Dramatic | `contrast(1.5) brightness(0.8) saturate(0.7)` | High contrast |

## Stickers

12 emoji stickers available:
❤️ 🔥 ⭐ 😊 😎 😍 🎉 🎵 ☀️ 🌙 🌈 👍

Each sticker has:
- `type`: Identifier
- `emoji`: Display character
- `x`: Horizontal position (0-100%)
- `y`: Vertical position (0-100%)

## Visibility Settings

| Setting | Description |
|---------|-------------|
| `friends` | Only friends can view (default) |
| `public` | Anyone can view (appears in Discover) |

## 24-Hour Expiration

```typescript
// On creation
expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)

// Cleanup checks
WHERE expiresAt < NOW() OR isExpired = true
```

## CDN Integration

```env
# Environment variables
AWS_REGION=us-east-1
AWS_S3_BUCKET=videochat-media
CDN_URL=https://d1234567890.cloudfront.net  # Optional CloudFront
```

If `CDN_URL` is set, all media URLs use the CDN instead of direct S3 URLs.

## Performance Optimization

### Frontend
- Lazy loading of images with `loading="lazy"`
- Video thumbnails instead of full videos in feed
- Progressive image loading
- Swipe gestures for story viewer

### Backend
- Batch processing for cleanup (100 items per batch)
- Database indexes on `expiresAt`, `userId`, `visibility`
- S3 presigned URLs (no server-side upload handling)
- CDN caching with `Cache-Control: public, max-age=86400`

### Storage
- Images: Max 10MB
- Videos: Max 50MB
- Automatic thumbnail generation for videos
- TTL-based cleanup prevents storage bloat

## Testing Scenarios

### Scenario 1: Create and View Moment

```
1. User creates moment with image
2. Upload to S3 via presigned URL
3. Create moment record in DB
4. Moment appears in friends' feeds
5. Friend views moment → view count increments
6. Friend likes moment → like count increments
```

### Scenario 2: 24-Hour Expiration

```
1. Moment created at T=0
2. expiresAt set to T+24h
3. At T+24h, cleanup job runs
4. Moment marked as expired
5. Media deleted from S3
6. Record deleted from DB
```

### Scenario 3: Story Viewer

```
1. User taps moment in feed
2. Story viewer opens at tapped moment
3. Auto-advance after 5s (image) or video duration
4. Swipe left/right to navigate
5. Tap to pause/resume
6. Like/reply from viewer
```

### Scenario 4: Discover Feed

```
1. User switches to Discover tab
2. API returns public moments ordered by views/likes
3. Non-friends' moments visible
4. Like/view tracking works same as friends feed
```

## Security

- **Presigned URLs**: 5-minute expiry for uploads
- **Visibility control**: Friends-only or public
- **Owner-only deletion**: Only creator can delete
- **Moderation**: Moments start as 'pending', require approval
- **File validation**: Type and size checks before upload
- **CDN**: Optional CloudFront for secure delivery
