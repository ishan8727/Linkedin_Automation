# End-to-End Testing Guide

**Complete guide to test all phases from database to agent execution.**

## Prerequisites

1. **Node.js** (v18+)
2. **PostgreSQL database** (local or Neon)
3. **npm** or **pnpm** (workspace uses pnpm)

## Phase 1: Database Setup

### Option A: Local PostgreSQL

```bash
# Create database
createdb linkedin

# Or using psql
psql -U postgres
CREATE DATABASE linkedin;
```

### Option B: Neon (Cloud PostgreSQL)

1. Go to https://neon.tech
2. Create a project
3. Copy the connection string

### Set Database URL

```bash
cd apps/backend
# Create .env file
echo 'DATABASE_URL="postgresql://user:password@localhost:5432/linkedin?schema=public"' > .env
# Or for Neon:
# DATABASE_URL="postgresql://user:password@ep-xxx.neon.tech/linkedin?sslmode=require"
```

## Phase 2-4: Backend Setup

### 1. Install Dependencies

```bash
# From root
npm install

# Or install in backend specifically
cd apps/backend
npm install
```

### 2. Generate Prisma Client

```bash
cd apps/backend
npm run prisma:generate
```

### 3. Run Migrations

```bash
cd apps/backend
npm run prisma:migrate
```

### 4. Start Backend Server

```bash
cd apps/backend
npm run dev
```

**Verify:** Open http://localhost:3000/health - should return `{"status":"ok"}`

## Phase 5: Agent Setup

### 1. Install Agent Dependencies

```bash
cd apps/agent
npm install
```

### 2. Install Playwright Browsers

```bash
cd apps/agent
npm run playwright:install
```

**This installs Chromium browser** - required for automation.

### 3. Configure Agent

```bash
cd apps/agent
# Create .env file
cat > .env << EOF
BACKEND_URL=http://localhost:3000
USER_ID=your-user-id-here
LINKEDIN_ACCOUNT_ID=your-linkedin-account-id-here
AGENT_VERSION=1.0.0
HEADLESS=false
BROWSER_TIMEOUT_MS=30000
EOF
```

**Note:** You need to create a User and LinkedInAccount in the database first (see Testing Flow below).

## Testing Flow

### Step 1: Create Test Data

You need to create:
1. A `User` record
2. A `LinkedInAccount` record linked to that user

**Option A: Using Prisma Studio**

```bash
cd apps/backend
npm run prisma:studio
```

Then manually create:
- User (with email)
- LinkedInAccount (linked to user, with profileUrl and displayName)

**Option B: Using SQL**

```bash
psql $DATABASE_URL
```

```sql
-- Create user
INSERT INTO "User" ("userId", "email", "createdAt", "updatedAt")
VALUES ('user-123', 'test@example.com', NOW(), NOW());

-- Create LinkedIn account
INSERT INTO "LinkedInAccount" (
  "linkedInAccountId",
  "userId",
  "profileUrl",
  "displayName",
  "validationStatus",
  "riskLevel",
  "createdAt",
  "updatedAt"
)
VALUES (
  'linkedin-123',
  'user-123',
  'https://linkedin.com/in/test',
  'Test User',
  'CONNECTED',
  'NORMAL',
  NOW(),
  NOW()
);
```

### Step 2: Update Agent .env

```bash
cd apps/agent
# Edit .env with the IDs from Step 1
USER_ID=user-123
LINKEDIN_ACCOUNT_ID=linkedin-123
```

### Step 3: Start Backend

```bash
cd apps/backend
npm run dev
```

**Verify:** `curl http://localhost:3000/health`

### Step 4: Start Agent

```bash
cd apps/agent
npm run dev
```

**Expected output:**
```
Initializing agent...
Browser initialized
Agent registered. Poll interval: 15s
Agent started
```

### Step 5: Create a Test Job

**Option A: Using Prisma Studio**

```bash
cd apps/backend
npm run prisma:studio
```

Create a Job:
- `jobId`: auto-generated
- `jobType`: `VISIT_PROFILE`
- `linkedInAccountId`: `linkedin-123`
- `state`: `PENDING`
- `parameters`: `{"profileUrl": "https://linkedin.com/in/test-profile"}`

**Option B: Using SQL**

```sql
INSERT INTO "Job" (
  "jobId",
  "jobType",
  "linkedInAccountId",
  "state",
  "parameters",
  "createdAt",
  "updatedAt"
)
VALUES (
  gen_random_uuid()::text,
  'VISIT_PROFILE',
  'linkedin-123',
  'PENDING',
  '{"profileUrl": "https://linkedin.com/in/test-profile"}'::jsonb,
  NOW(),
  NOW()
);
```

### Step 6: Watch Agent Execute

The agent should:
1. Pull the job
2. Execute it (visit profile)
3. Report result
4. Upload screenshots

**Check backend logs** for job state transitions.

## Verification Checklist

- [ ] Database connected and migrated
- [ ] Backend running on port 3000
- [ ] Health check returns `{"status":"ok"}`
- [ ] Playwright browsers installed
- [ ] Agent .env configured with valid IDs
- [ ] User and LinkedInAccount exist in database
- [ ] Agent registers successfully
- [ ] Agent sends heartbeats
- [ ] Job created in PENDING state
- [ ] Agent pulls job
- [ ] Agent executes job
- [ ] Job result reported
- [ ] Screenshots uploaded

## Troubleshooting

### Playwright Not Working

```bash
# Reinstall browsers
cd apps/agent
npx playwright install chromium

# Verify installation
npx playwright --version
```

### Agent Can't Connect to Backend

1. Check `BACKEND_URL` in agent `.env`
2. Verify backend is running: `curl http://localhost:3000/health`
3. Check CORS settings in backend

### Agent Registration Fails

1. Verify `USER_ID` and `LINKEDIN_ACCOUNT_ID` exist in database
2. Check backend logs for errors
3. Verify LinkedInAccount belongs to User

### Browser Not Opening

1. Set `HEADLESS=false` in agent `.env`
2. Check if Chromium is installed: `npx playwright install chromium`
3. Check system dependencies (Linux may need additional packages)

### Job Not Executing

1. Verify job is in `PENDING` state
2. Check agent logs for errors
3. Verify `executionAllowed` is `true` in heartbeat response
4. Check risk-safety domain (may be blocking execution)

## Quick Test Script

```bash
#!/bin/bash
# quick-test.sh

echo "1. Starting backend..."
cd apps/backend && npm run dev &
BACKEND_PID=$!

sleep 5

echo "2. Testing health endpoint..."
curl http://localhost:3000/health

echo "3. Starting agent..."
cd ../agent && npm run dev &
AGENT_PID=$!

echo "4. Agents running. Press Ctrl+C to stop."
wait
```

## Next Steps

Once basic flow works:
1. Test all job types (VISIT_PROFILE, SEND_CONNECTION_REQUEST, etc.)
2. Test error scenarios (timeout, UI_CHANGED, etc.)
3. Test safety boundaries (heartbeat denial, risk pause)
4. Test screenshot uploads
5. Test event logging

