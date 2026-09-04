# Requirements (MVP vs Phase 2)

This document converts the plan into concrete, testable acceptance criteria.

## Product definitions

- **Match**: a pairing of two users who are connected for a timed 1:1 video chat attempt.
- **Session**: the underlying video-provider room / call session attached to a match.
- **Extend**: a user action indicating they want to continue the call past the 15s timer.
- **Moment**: a story-like post (photo/video) that expires after 24 hours.

## MVP requirements (must ship for beta)

### 1) Accounts & auth

- **MVP-Auth-1**: A user can create an account with email+OTP or phone+OTP.
- **MVP-Auth-2**: Login requires OTP verification; the system rate-limits OTP requests per IP/device/account.
- **MVP-Auth-3**: A user can log out and revoke their active session token(s).
- **MVP-Auth-4**: Suspended/banned users cannot start matching, and see a clear “access restricted” state.

### 2) 18+ gating (adult-only)

- **MVP-Age-1**: Before starting matching, the user must confirm they are 18+ and provide DOB (or birth year, if configured).
- **MVP-Age-2**: DOB is never displayed publicly; profile shows only **age**.
- **MVP-Age-3**: Users can report “suspected underage”. Moderation can suspend/ban.
- **MVP-Age-4**: Users self-declaring <18 are blocked from account activation/matching.

### 3) Profiles (age + gender)

- **MVP-Profile-1**: User profile contains age (derived), gender, and optional avatar and bio.
- **MVP-Profile-2**: Profile updates are validated (length limits, allowed enum values).
- **MVP-Profile-3**: Bio/caption inputs are scanned for PII patterns and disallowed content (at minimum profanity/links in MVP).

### 4) Random matching (15-second timed) + mutual extend

- **MVP-Match-1**: User can click **Start** and enter a matching queue.
- **MVP-Match-2**: When two users are matched, both see the other’s profile summary (age, gender, avatar if present) and the call connects.
- **MVP-Match-3**: A visible **15-second countdown** starts when both clients report “connected”.
- **MVP-Match-4**: Either user can **Skip/End** at any time; the match ends immediately for both.
- **MVP-Match-5**: **Mutual extend**: if both users press Extend before timer reaches 0 (or within a 2s grace window), the match continues.
  - Default MVP: a single extend that adds 60 seconds (configurable).
- **MVP-Match-6**: If only one user presses Extend, the match ends at timeout and the UI explains “Not extended”.
- **MVP-Match-7**: Blocked users are never matched with each other.
- **MVP-Match-8**: Abuse controls: max queue joins/minute and max concurrent sessions per account/device.

### 5) WebRTC video chat via managed provider

- **MVP-Video-1**: Calls are 1:1 with camera+mic; user can mute mic and disable camera.
- **MVP-Video-2**: The system handles common WebRTC failures (permission denied, device missing) with user-facing recovery prompts.
- **MVP-Video-3**: Provider room/session IDs are stored against the match for moderation and analytics.

### 6) Video filters (basic, client-side)

- **MVP-Filters-1**: User can enable a blur/background effect and at least 2 simple color filters.
- **MVP-Filters-2**: Filters apply only to outgoing video; disabling filters restores original video.
- **MVP-Filters-3**: Filters do not reduce frame rate below an acceptable threshold on mid-tier devices (target 20+ fps).

### 7) Moments (basic stories)

- **MVP-Moments-1**: A user can post a photo or short video moment with a caption.
- **MVP-Moments-2**: Moments expire 24 hours after creation (not visible in feed; retained per retention policy).
- **MVP-Moments-3**: A user can view a feed of moments from accounts they follow (MVP can treat “follow” as “mutual extend created connection”).
- **MVP-Moments-4**: A user can delete their own moment.

### 8) Reporting + blocking

- **MVP-Safety-1**: In-call, a user can report the other user with a category + optional text note.
- **MVP-Safety-2**: Reporting ends the call immediately (or optionally offers end-call after report; default: end).
- **MVP-Safety-3**: A user can block another user; blocked pairs can’t match again.
- **MVP-Safety-4**: Reports are visible to moderators in an internal console and linked to the match/session.

### 9) Moderation ops (minimal console)

- **MVP-Mod-1**: Moderators can view reports, filter by category/time, and see reporter/reported user history.
- **MVP-Mod-2**: Moderators can take actions: warn, suspend (duration), ban (permanent).
- **MVP-Mod-3**: All moderation actions create an immutable audit log entry.

### 10) Observability + abuse prevention

- **MVP-Obs-1**: Track match funnel metrics: queue join → match → connected → ended reasons.
- **MVP-Obs-2**: Collect basic call quality metrics where available (connect time, disconnect reason, client stats).
- **MVP-Obs-3**: Rate limits at edge/API: auth endpoints, queue join, report submit, moment upload.

## Phase 2 requirements (growth + safety hardening)

### A) Premium subscriptions

- **P2-Premium-1**: Users can subscribe/cancel/restore via Stripe.
- **P2-Premium-2**: Entitlements are enforced server-side (never trust client-only flags).
- **P2-Premium-3**: Billing webhooks are verified and update subscription status reliably.

### B) Matching filters

- **P2-Filters-1**: Premium gender filter and region/language preferences affect matchmaking eligibility.
- **P2-Filters-2**: Anti-bias constraint: the system may relax filters if queue time exceeds threshold (configurable).

### C) Moments explore + discovery

- **P2-Moments-1**: Optional explore feed; content is moderated before appearing in explore.
- **P2-Moments-2**: Reactions/likes with anti-spam rate limits.

### D) Advanced video filters/AR

- **P2-AR-1**: Face tracking-based effects (vendor or in-house), with performance safeguards.

### E) Improved moderation + staffing workflow

- **P2-Mod-1**: 24/7 queue with triage, SLAs, escalation levels, and assignment.
- **P2-Mod-2**: Appeals process with audit trail.
- **P2-Mod-3**: Device-ban support and stronger evasion detection.

### F) ML moderation (realtime + async)

- **P2-ML-1**: Nudity/violence scoring for uploaded media (moments) and call evidence assets.
- **P2-ML-2**: OCR + toxicity scanning for captions/bios.
- **P2-ML-3**: Underage risk scoring signals into moderation queues (assistive, not solely determinative).
- **P2-ML-4**: Automated enforcement only for high-confidence outcomes + human review fallback.

### G) Multi-region

- **P2-Region-1**: Region-aware routing for video + services; data residency constraints supported for EU.

