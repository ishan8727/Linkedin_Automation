# High-Level Design (HLD)
## LinkedIn Context-Aware Outreach Automation — v1

---

## 0. Purpose

This document defines the complete high-level system architecture for the LinkedIn Context-Aware Outreach Automation platform.

It converts:
- PRD (business intent)
- Feature Specification (exact behavior)

into:
- System boundaries
- Execution and scheduling model
- Browser automation architecture
- Data ownership and API surfaces

This document is authoritative for implementation and AI-assisted coding.

---

## 1. System Overview

The system follows a strict two-plane architecture:

### Control Plane
- Web dashboard
- Backend APIs
- Campaign logic
- Scheduling and orchestration
- Risk monitoring
- Analytics and activity logs
- Live execution visibility mediation

### Execution Plane
- Local automation agent on user’s machine
- Browser-based LinkedIn interactions
- Screenshot and event capture

Risky automation is isolated from user-facing stability.

---

## 2. HLD Layer 1 — System Boundaries & Deployment Model

### 2.1 Product Shape
- Control Plane and Execution Plane are separate systems
- Automation failures must not affect dashboard availability

### 2.2 Deployment
- Single-region deployment (v1)
- Multi-region explicitly out of scope

### 2.3 Backend Responsibilities
Backend acts as the control plane and is responsible for:
- Authentication and user management
- Campaign configuration
- State machine definitions
- Job creation and ordering
- Risk monitoring decisions
- Analytics aggregation
- Activity logging
- Visibility stream mediation

Backend never executes LinkedIn actions.

### 2.4 Automation Execution Location
- All LinkedIn automation runs on the user’s machine
- Uses the user’s real browser session
- No server-side browser automation

### 2.5 Browser Session Ownership
- Browser session is user-owned
- System piggybacks via extension/agent
- No credential storage

### 2.6 Failure Isolation
- Failures are isolated per LinkedIn account
- No cross-user blast radius

### 2.7 Live Visibility Model
- Visibility reconstructed from:
  - Structured execution events
  - Screenshots
- No raw video streaming

### 2.8 Source of Truth
- Backend database is the single source of truth

### 2.9 Scale Assumption (v1)
- 10–50 active users
- Correctness prioritized over throughput

---

## 3. HLD Layer 2 — Execution, Scheduling & State Flow

### 3.1 Execution Unit
- Smallest executable unit is one LinkedIn action
  (e.g. visit profile, send request, like post)

### 3.2 Job Lifecycle

1. Backend creates job with unique ID
2. Job becomes eligible based on campaign rules
3. Local agent pulls job
4. Agent executes action
5. Agent reports outcome
6. Backend commits state

### 3.3 Scheduling Model
- Backend:
  - Determines eligibility and ordering
  - Enforces campaign logic
- Agent:
  - Decides safe execution timing
  - Applies randomness and jitter

### 3.4 Delay & Cooldown
- Backend defines earliest allowed execution time
- Agent applies human-like randomization

### 3.5 State Transitions
- State machines defined in backend
- Agent enforces transitions
- Backend commits all state updates

### 3.6 Failure Handling
- Retries with exponential backoff
- Retry limits enforced
- Persistent failures halt the lead, not the system

### 3.7 Pause / Resume Authority
- User can pause anytime
- Risk system can force pause immediately
- Resume always requires user action

### 3.8 Offline Behavior
- Jobs persist while agent offline
- Resume when agent reconnects
- No reassignment

### 3.9 Concurrency
- One LinkedIn action at a time per account
- No parallel execution

### 3.10 Idempotency
- Backend generates unique job IDs
- Duplicate execution safely ignored

---

## 4. HLD Layer 3 — Browser Automation & Local Agent Architecture

### 4.1 Agent Architecture
- Hybrid model:
  - Browser extension
  - Lightweight local service

### 4.2 Browser Support (v1)
- Chrome only

### 4.3 Automation Technique
- DOM-level automation
  - querySelector
  - click and input events
- No OS-level automation
- No server-side browser control

### 4.4 Authentication
- Uses user’s existing logged-in LinkedIn session
- No credential handling

### 4.5 Agent ↔ Backend Communication
- Hybrid communication:
  - WebSocket when available
  - Polling fallback

### 4.6 Proof of Action
- Structured execution events
- Screenshots captured:
  - Before each action
  - After each action
  - On failures

### 4.7 UI Change Handling
- One heuristic retry allowed
- If still failing:
  - Halt execution
  - Report error to backend

### 4.8 Security Boundary
- Agent may handle:
  - Session cookies
  - Temporary DOM data
- Agent must not persist:
  - Full profiles
  - Message history
  - Long-term user data

### 4.9 Update Strategy
- Forced agent updates
- UI updates may be soft

---

## 5. HLD Layer 4 — Data Model, APIs & Integration Surfaces

### 5.1 Data Ownership
- Backend database owns all authoritative data
- Agent holds only transient operational state

### 5.2 Agent Persistence
- Minimal cache only:
  - Last job cursor
  - Heartbeat timestamp
  - Retry counters

### 5.3 Core Backend Entities
- User
- LinkedInAccount
- Lead
- Campaign
- CampaignPhase
- Job / Action
- RiskEvent
- ActivityLog

Screenshots and visibility artifacts are attached to ActivityLog entries.

### 5.4 State Machines
- Defined centrally in backend
- Enforced by agent
- Deterministic and auditable

### 5.5 API Style
- REST APIs
- Explicit resources
- Versioned endpoints

### 5.6 Agent Contract
- Task-based interaction model
- Agent receives jobs, not commands

### 5.7 Idempotency
- Backend-generated job IDs
- Backend enforces single-execution semantics

### 5.8 Visibility Data Flow
- Agent → Backend → UI
- Backend validates, stores, streams

### 5.9 API Consumers (v1)
- Web dashboard
- Local automation agent

### 5.10 AI-Friendliness
- APIs designed for:
  - Human readability
  - AI code generation
  - Explicit contracts
  - Predictable errors

---

## 6. Out of Scope (Explicit)

- Server-side browser automation
- Multi-account per user
- Cross-user data sharing
- Video recording
- External integrations

---

## 7. Completion Statement

This HLD fully defines:
- System boundaries
- Execution model
- Automation architecture
- Data authority
- Integration contracts

No architectural decisions remain open for v1.
All future work proceeds at API, schema, and implementation level.

---

