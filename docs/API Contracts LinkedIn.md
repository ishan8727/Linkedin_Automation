---

# API Contracts — LinkedIn Context-Aware Outreach Automation

This document defines the authoritative API contracts for the **Execution Plane** (Agent ↔ Backend) and the **Control Plane** (Dashboard ↔ Backend).

## GLOBAL API CONVENTIONS

### Base Assumptions

* **Backend is the single source of truth.**
* Agent and Dashboard are untrusted clients.
* All state transitions happen in the backend.
* APIs are synchronous HTTP unless specified.

### Authentication

All requests require the following header:
`Authorization: Bearer <token>`

**Two token types:**

1. **User token:** Scoped to Dashboard/UI actions.
2. **Agent token:** Scoped to exactly one LinkedIn account.

### Standard Error Response

```json
{
  "errorCode": "STRING_ENUM",
  "message": "Human readable explanation"
}

```

**Common error codes:** `UNAUTHORIZED`, `FORBIDDEN`, `RESOURCE_NOT_FOUND`, `INVALID_STATE`, `RATE_LIMITED`, `RISK_PAUSED`, `SESSION_INVALID`.

---

## PART 1: AGENT ↔ BACKEND CONTRACTS (Execution Plane)

These APIs allow the backend to delegate execution while maintaining total control.

### 1. Agent Registration

**Purpose:** Bind a local agent instance to one LinkedIn account and issue a scoped agent token.

* **Endpoint:** `POST /agent/register`
* **Request:**

```json
{
  "userId": "uuid",
  "linkedinAccountId": "uuid",
  "agentVersion": "1.0.0",
  "browser": "chrome",
  "os": "macos | windows | linux"
}

```

* **Response:**

```json
{
  "agentToken": "string",
  "pollIntervalSeconds": 15
}

```

* **Behavior:** Token is valid only for this LinkedIn account. Re-registration rotates the token.

### 2. Heartbeat (Liveness + Risk Enforcement)

**Purpose:** Prove agent is alive and allow backend to stop execution immediately.

* **Endpoint:** `POST /agent/heartbeat`
* **Request:**

```json
{
  "linkedinAccountId": "uuid",
  "status": "IDLE | EXECUTING | PAUSED",
  "currentJobId": "uuid | null"
}

```

* **Response:**

```json
{
  "allowed": true,
  "reason": "RISK_PAUSE | USER_PAUSED | SESSION_INVALID | null"
}

```

* **Behavior:** If `allowed = false`, agent must stop current execution and stop pulling new jobs.

### 3. Pull Jobs (Core Execution API)

**Purpose:** Agent pulls the next set of tasks.

* **Endpoint:** `GET /agent/jobs?linkedinAccountId=uuid`
* **Response:**

```json
{
  "jobs": [
    {
      "jobId": "uuid",
      "type": "VISIT_PROFILE | SEND_CONNECTION_REQUEST | LIKE_POST | COMMENT_POST | SEND_MESSAGE",
      "leadId": "uuid",
      "payload": {
        "profileUrl": "string",
        "messageText": "string | null",
        "noteText": "string | null",
        "postUrl": "string | null"
      },
      "earliestExecutionTime": "ISO-8601 timestamp",
      "timeoutSeconds": 120
    }
  ]
}

```

* **Behavior:** Jobs are immutable and ordered. Agent must respect `earliestExecutionTime`.

### 4. Report Job Result

**Purpose:** Agent reports facts; Backend commits transitions.

* **Endpoint:** `POST /agent/jobs/{jobId}/result`
* **Request:**

```json
{
  "status": "SUCCESS | FAILED | SKIPPED",
  "failureReason": "UI_CHANGED | TIMEOUT | SESSION_EXPIRED | UNKNOWN | null",
  "metadata": {
    "observedState": "CONNECTED | PENDING | NONE | null"
  }
}

```

* **Behavior:** Agent must not retry unless backend reissues the job. Submissions must be idempotent.

### 5. Execution Events (Logs + Live View)

**Purpose:** Human-readable trace of automation activity.

* **Endpoint:** `POST /agent/events`
* **Request:**

```json
{
  "jobId": "uuid",
  "eventType": "ACTION_STARTED | ACTION_COMPLETED | WARNING | INFO",
  "message": "string",
  "timestamp": "ISO-8601"
}

```

### 6. Screenshot Upload (Proof of Action)

* **Endpoint:** `POST /agent/screenshots`
* **Request:** `multipart/form-data` (image file + JSON metadata)

```json
{
  "jobId": "uuid",
  "stage": "BEFORE | AFTER | FAILURE"
}

```

### 7. Control State Check

**Purpose:** Redundant check to ensure execution is still permitted.

* **Endpoint:** `GET /agent/control-state?linkedinAccountId=uuid`
* **Response:**

```json
{
  "executionAllowed": true,
  "reason": "USER_PAUSED | RISK_PAUSE | SESSION_INVALID | null"
}

```

---

## PART 2: DASHBOARD ↔ BACKEND CONTRACTS (Control Plane)

Dashboard configures intent and reads truth.

### 8. Authentication

* `POST /auth/login`
* `GET /auth/me`

### 9. LinkedIn Account Status

* **Endpoint:** `GET /linkedin-account`
* **Response:**

```json
{
  "linkedinAccountId": "uuid",
  "status": "CONNECTED | DISCONNECTED | EXPIRED | PAUSED",
  "riskLevel": "NORMAL | ELEVATED | HIGH | BLOCKED",
  "lastActiveAt": "ISO-8601 | null"
}

```

### 10. Leads

* **Import:** `POST /leads/import` (CSV Upload)
* **List:** `GET /leads`
* **Archive:** `POST /leads/{leadId}/archive`

### 11. Campaigns

* **Create:** `POST /campaigns`
* **Assign Leads:** `POST /campaigns/{campaignId}/leads`
* **Lifecycle:** `POST /campaigns/{campaignId}/start` | `pause`
* **Status:** `GET /campaigns/{campaignId}`

### 12. Jobs & Activity

* **Jobs (Read-only):** `GET /jobs?campaignId=`
* **Activity Logs:** `GET /activity-logs`
* **Live Visibility:** `GET /live-execution` | `GET /screenshots?jobId=`

### 13. Risk & Analytics

* **Risk Status:** `GET /risk-status`
* **Risk Ack:** `POST /risk/acknowledge`
* **Analytics:** `GET /analytics/summary`

```json
{
  "leadsImported": 200,
  "connectionsSent": 150,
  "connectionsAccepted": 60,
  "messagesSent": 40
}

```

---
