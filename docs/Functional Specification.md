# Functional Specification – LinkedIn Automation v1

This document defines exact system behavior for all v1 features.
It is the authoritative source for architecture, APIs, and implementation.

---

## Feature 1: Lead Import & Storage

### Purpose
Store LinkedIn leads safely and deterministically for automation use.

### Source
- CSV upload only

### Identity
- Primary identifier: LinkedIn profile URL
- Normalized and immutable

### Duplicate Handling
- Merge on duplicate URL per user
- User-level isolation

### Lead States
- Imported
- Profile Visited
- Connection Requested
- Connected
- Messaged
- Archived

### Rules
- No automation on import
- Leads must be assigned to a campaign

---

## Feature 2: LinkedIn Account Connection

### Constraints
- One LinkedIn account per user
- Reconnection allowed
- Browser-based session authentication only

### States
- Disconnected
- Connected
- Expired
- Manually Disconnected

### Rules
- No credential storage
- Automation pauses on session expiry
- User must re-auth manually

---

## Feature 3: Profile Context Acquisition

### Trigger
- Only after lead enters campaign
- After genuineness phase

### Data Collected
- Headline
- Role & company
- About section
- Recent activity
- Connections count

### Storage
- Immutable snapshots
- Timestamped
- Campaign-linked

### Failure Handling
- Retry later
- Do not block campaign

---

## Feature 4: Campaign Execution Engine

### Model
- Deterministic state machine
- One campaign per lead

### Phases
1. Send connection request
2. Monitor acceptance
3. Trust-building interactions (7–10 days)
4. Profile context acquisition
5. Message generation & sending

### Actions
- Profile visits
- Connection requests
- Likes/comments
- Message sending

### Rate Limits
- Fixed system-wide limits
- Non-overridable

---

## Feature 5: Message Generation

### Trigger Conditions
- Lead connected
- Context snapshot exists
- Campaign reaches message phase

### Inputs
- Profile snapshot
- Campaign intent

### Constraints
- Short, single-paragraph
- No links, emojis, or hype
- Reference at most one insight
- No sales pitch

### Automation
- Auto-send
- Logged with full context

---

## Feature 6: Risk Monitoring & Safeguards

### Signals
- Action velocity
- Repeated failures
- UI anomalies
- Platform interruptions

### Risk States
- Normal
- Elevated
- High Risk
- Blocked

### Rules
- Risk system overrides campaigns
- No user override of safety
- Default action on uncertainty: pause

---

## Feature 7: Analytics & Activity Logs

### Primary Goal
- Build trust and transparency

### Analytics Levels
- Lead-level
- Campaign-level
- Account-level
- Message-level

### Time Resolution
- Near real-time

### Logs
- Action-level visibility
- Immutable
- User + support readable

---

## Feature 8: Live Execution Visibility

### Purpose
- Show automation behaving like a human

### Definition of Live
- Near real-time (5–10s delay)
- View-only

### Visible Actions
- Profile visits
- Requests
- Likes/comments
- Messages
- Pauses and risk halts

### Storage
- No recording
- No replay

---

## Non-Goals (v1)

- Multi-channel automation
- Auto-replies
- Optimization AI
- Historical video playback

---

