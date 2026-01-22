# LinkedIn Automation Platform - Implementation Roadmap

## Overview

This roadmap follows the exact phases defined in PROJECT_CONTEXT.md. Each phase must be completed in order. No jumping ahead.

**Current Status:** Phase 1-5 ✅ Complete | Phase 6 ⏳ Next (Frontend Dashboard)

---

## Phase 1: Database & Ownership ✅ COMPLETE

- [x] Prisma schema designed and audited
- [x] Schema validated
- [x] No forbidden models
- [x] Minimal inverse relations

**Schema Location:** `apps/backend/prisma/schema.prisma`

---

## Phase 2: Backend Service Skeleton ✅ COMPLETE

**Goal:** Create folder structure per domain. No business logic yet. One service = one domain.

### 2.1 Project Setup

- [x] Initialize TypeScript configuration
- [x] Set up Express/Fastify server skeleton
- [x] Configure Prisma client generation
- [x] Set up environment variable management (.env)
- [x] Add shared packages dependencies

### 2.2 Domain Folder Structure

Create the following structure in `apps/backend/src/`:

```
src/
├── domains/
│   ├── auth-identity/          # Domain 1: Auth & Identity
│   │   └── index.ts            # Service skeleton only
│   ├── linkedin-account/       # Domain 2: LinkedInAccount Management
│   │   └── index.ts
│   ├── agent-management/       # Domain 3: Agent Management
│   │   └── index.ts
│   ├── job-execution/          # Domain 4: Job & Execution Control
│   │   └── index.ts
│   ├── risk-safety/            # Domain 5: Risk & Safety
│   │   └── index.ts
│   └── observability/          # Domain 6: Observability & Audit
│       └── index.ts
├── api/
│   ├── agent/                  # Agent ↔ Backend endpoints
│   │   └── routes.ts           # Route definitions only
│   └── dashboard/              # Dashboard ↔ Backend endpoints
│       └── routes.ts
├── middleware/
│   ├── auth.ts                 # Token validation
│   └── error-handling.ts       # Standard error responses
├── types/
│   └── api.ts                  # Request/Response types from API contracts
└── index.ts                    # Server entry point
```

### 2.3 Domain Ownership Matrix

Document which domain owns which tables:

| Domain | Owns Tables | Write Permission |
|--------|-------------|------------------|
| auth-identity | User | User only |
| linkedin-account | LinkedInAccount | LinkedInAccount only |
| agent-management | Agent, AgentToken | Agent, AgentToken only |
| job-execution | Job, JobResult | Job, JobResult only |
| risk-safety | RateLimitRule, Violation, RiskScore | RateLimitRule, Violation, RiskScore only |
| observability | AuditLog, Metric | AuditLog, Metric only (append-only) |

**Rules:**
- Each domain can ONLY write to its owned tables
- Domains can READ from other tables (for validation, lookups)
- Observability domain is append-only, read-only for decisions

### 2.4 Deliverables

- [x] Folder structure created
- [x] Empty service files per domain
- [x] Route files with empty handlers
- [x] Domain ownership matrix documented
- [x] No business logic implemented yet

---

## Phase 3: Internal APIs ✅ COMPLETE

**Goal:** Map which service can write which table. Enforce write boundaries.

### 3.1 Domain Service Interfaces

- [x] Define service interfaces per domain
- [x] Document read/write permissions
- [x] Create type-safe domain boundaries

### 3.2 Cross-Domain Communication

- [x] Define how domains communicate (events, direct calls)
- [x] Implement domain boundary enforcement
- [x] Add validation layer for cross-domain reads

### 3.3 Internal API Contracts

- [x] Document internal service-to-service contracts
- [x] Define error handling between domains
- [x] Create domain event types (if needed)

### 3.4 Deliverables

- [x] Domain interfaces defined
- [x] Write boundaries enforced
- [x] Cross-domain communication pattern established
- [x] Internal API contracts documented

---

## Phase 4: External API Implementation ✅ COMPLETE

**Goal:** Implement Agent ↔ Backend and Dashboard ↔ Backend APIs per API Contracts document.

### 4.1 Agent ↔ Backend APIs (Execution Plane)

From `API Contracts LinkedIn.md` Part 1:

- [x] `POST /agent/register` - Agent registration
- [x] `POST /agent/heartbeat` - Liveness + risk enforcement
- [x] `GET /agent/jobs` - Pull jobs
- [x] `POST /agent/jobs/{jobId}/result` - Report job result
- [x] `POST /agent/events` - Execution events
- [x] `POST /agent/screenshots` - Screenshot upload
- [x] `GET /agent/control-state` - Control state check

**Domain Mapping:**
- Agent registration → `agent-management` domain
- Heartbeat → `agent-management` + `risk-safety` domains
- Pull jobs → `job-execution` domain
- Report result → `job-execution` domain
- Events → `observability` domain
- Screenshots → `observability` domain
- Control state → `risk-safety` + `linkedin-account` domains

### 4.2 Dashboard ↔ Backend APIs (Control Plane)

From `API Contracts LinkedIn.md` Part 2:

- [x] `POST /auth/login` - Authentication
- [x] `GET /auth/me` - Current user
- [x] `GET /linkedin-account` - Account status
- [x] `POST /leads/import` - CSV import
- [x] `GET /leads` - List leads
- [x] `POST /leads/{leadId}/archive` - Archive lead
- [x] `POST /campaigns` - Create campaign
- [x] `POST /campaigns/{campaignId}/leads` - Assign leads
- [x] `POST /campaigns/{campaignId}/start` - Start campaign
- [x] `POST /campaigns/{campaignId}/pause` - Pause campaign
- [x] `GET /campaigns/{campaignId}` - Campaign status
- [x] `GET /jobs` - List jobs (read-only)
- [x] `GET /activity-logs` - Activity logs
- [x] `GET /live-execution` - Live visibility
- [x] `GET /screenshots?jobId=` - Get screenshots
- [x] `GET /risk-status` - Risk status
- [x] `POST /risk/acknowledge` - Acknowledge risk
- [x] `GET /analytics/summary` - Analytics summary

**Domain Mapping:**
- Auth → `auth-identity` domain
- LinkedIn account → `linkedin-account` domain
- Leads → `job-execution` domain (leads are part of job creation)
- Campaigns → `job-execution` domain
- Jobs → `job-execution` domain
- Activity logs → `observability` domain
- Risk → `risk-safety` domain
- Analytics → `observability` domain

### 4.3 Authentication & Authorization

- [x] Implement user token validation
- [x] Implement agent token validation
- [x] Enforce token scoping (user vs agent)
- [x] Add middleware for route protection

### 4.4 Error Handling

- [x] Standard error response format
- [x] Error codes per API contract
- [x] Domain-specific error mapping

### 4.5 Deliverables

- [x] All Agent APIs implemented
- [x] All Dashboard APIs implemented
- [x] Authentication working
- [x] Error handling standardized
- [x] APIs match contracts exactly

---

## Phase 5: Agent Implementation ✅ COMPLETE

**Goal:** Playwright executor with strict adherence to execution contract.

### 5.1 Agent Setup

- [x] Initialize agent project structure
- [x] Set up Playwright
- [x] Configure browser automation
- [x] Set up agent ↔ backend communication (HTTP polling)

### 5.2 Execution Contract Implementation

From PROJECT_CONTEXT.md Section 6:

**Agent MAY:**
- [x] Register itself
- [x] Send heartbeat
- [x] Pull jobs
- [x] Execute exactly one job at a time
- [x] Report factual results
- [x] Upload screenshots
- [x] Stop immediately on error

**Agent MUST NEVER:**
- [x] Decide what to execute (enforced in code)
- [x] Retry jobs (enforced in code)
- [x] Reorder jobs (enforced in code)
- [x] Infer backend state (enforced in code)
- [x] Work offline (enforced in code)
- [x] Handle credentials (enforced in code)
- [x] Continue after refusal (enforced in code)

### 5.3 Job Execution

- [x] Implement job type handlers:
  - [x] VISIT_PROFILE
  - [x] SEND_CONNECTION_REQUEST
  - [x] LIKE_POST
  - [x] COMMENT_POST
  - [x] SEND_MESSAGE
- [x] Respect `earliestExecutionTime`
- [x] Apply human-like randomization
- [x] Capture screenshots (before/after/failure)
- [x] Report execution events

### 5.4 Safety & Compliance

- [x] Implement heartbeat checks
- [x] Stop on `allowed = false` from heartbeat
- [x] Respect control state checks
- [x] Handle session expiry
- [x] Implement timeout handling

### 5.5 Deliverables

- [x] Agent can register and authenticate
- [x] Agent can pull and execute jobs
- [x] Agent reports results correctly
- [x] Agent respects all safety boundaries
- [x] Agent never violates execution contract

**Implementation Location:** `apps/agent/src/`
**Key Files:**
- `agent.ts` - Main agent loop with heartbeat and job polling
- `jobs/handlers.ts` - All 5 job type handlers
- `browser/manager.ts` - Playwright browser management
- `api/client.ts` - Backend API client

---

## Phase 6: Frontend Dashboard ⏳ NEXT

**Goal:** Next.js dashboard. No direct DB access. Backend only.

### 6.1 Frontend Setup

- [ ] Set up Next.js project (already exists)
- [ ] Configure API client for backend
- [ ] Set up authentication flow
- [ ] Create layout and routing

### 6.2 Core Pages

- [ ] Login/Auth page
- [ ] LinkedIn account connection page
- [ ] Lead import page (CSV upload)
- [ ] Campaign creation/management page
- [ ] Dashboard/analytics page
- [ ] Activity logs page
- [ ] Live execution visibility page
- [ ] Risk status page

### 6.3 Features

- [ ] Lead import with CSV parsing
- [ ] Campaign configuration UI
- [ ] Real-time activity feed
- [ ] Analytics visualization
- [ ] Screenshot viewing
- [ ] Risk alerts and acknowledgments

### 6.4 Deliverables

- [ ] All pages implemented
- [ ] All features working
- [ ] No direct database access
- [ ] All data from backend APIs

---

## Phase 7: Testing & Validation

### 7.1 Unit Tests

- [ ] Domain service tests
- [ ] API endpoint tests
- [ ] Agent execution tests

### 7.2 Integration Tests

- [ ] Backend ↔ Agent integration
- [ ] Dashboard ↔ Backend integration
- [ ] End-to-end campaign flow

### 7.3 Safety Validation

- [ ] Execution contract compliance
- [ ] Domain boundary enforcement
- [ ] Risk system validation

---

## Schema Discrepancy Note

**Important:** The `schema.sql` file contains Campaign and Lead models, but the authoritative Prisma schema (`apps/backend/prisma/schema.prisma`) does not. 

The Prisma schema uses:
- `Job.parameters` (Json) to store job-specific data (likely including lead profileUrl)
- No explicit Campaign or Lead tables

**Decision needed:** 
- Are Campaigns/Leads application-level concepts stored in Job.parameters?
- Or should we add Campaign/Lead models to Prisma schema?

**Action:** Clarify this before implementing Phase 4 (External APIs) that reference campaigns and leads.

---

## Implementation Notes

### Critical Rules

1. **Never jump phases** - Complete each phase fully before moving on
2. **Never invent features** - Follow API contracts and functional specs exactly
3. **Respect domain ownership** - Each domain can only write to its tables
4. **Agent has zero autonomy** - Backend decides, agent executes
5. **No credential storage** - Browser session lives on user's machine

### Key Documents Reference

- **Architecture:** PROJECT_CONTEXT.md (project-guide.mdc)
- **API Contracts:** `docs/API Contracts LinkedIn.md`
- **Functional Spec:** `docs/Functional Specification.md`
- **HLD:** `docs/High Level Design HLD.md`
- **PRD:** `docs/Product Requirements Document.md`
- **Schema:** `apps/backend/prisma/schema.prisma`

### Questions to Ask

If something is missing or unclear:
1. Check the docs folder first
2. Check PROJECT_CONTEXT.md
3. Ask before implementing

---

## Next Steps

**Immediate:** Begin Phase 6 - Frontend Dashboard

1. Set up Next.js project (already exists in `apps/frontend/`)
2. Configure API client for backend
3. Set up authentication flow
4. Create campaign management UI
5. Implement analytics and activity logs
6. Add lead import functionality
7. Test against backend APIs

**Key Files to Reference:**
- `apps/backend/src/api/dashboard/routes.ts` - Dashboard API implementations
- `docs/API Contracts LinkedIn.md` - Dashboard API contracts
- `.cursor/rules/project-guide.mdc` - Architecture rules

