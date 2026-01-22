# Quick Start Guide

**Get the LinkedIn Automation Platform running in 5 minutes.**

## Prerequisites Check

```bash
# Run verification script
./verify-setup.sh
```

## Step-by-Step Setup

### 1. Install Dependencies

```bash
# From project root
npm install

# Or individually:
cd apps/backend && npm install
cd ../agent && npm install
```

### 2. Install Playwright Browsers

```bash
cd apps/agent
npm run playwright:install
```

**Verify Playwright works:**
```bash
npm run test:playwright
```

### 3. Set Up Database

**Option A: Local PostgreSQL**
```bash
createdb linkedin
```

**Option B: Neon (Cloud)**
- Go to https://neon.tech
- Create project
- Copy connection string

### 4. Configure Backend

```bash
cd apps/backend

# Create .env file
cat > .env << EOF
DATABASE_URL="postgresql://user:password@localhost:5432/linkedin?schema=public"
PORT=3000
NODE_ENV=development
EOF

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate
```

### 5. Create Test Data

**Using Prisma Studio:**
```bash
cd apps/backend
npm run prisma:studio
```

Create:
1. **User** (email: test@example.com)
2. **LinkedInAccount** (linked to user, profileUrl: https://linkedin.com/in/test)

**Or using SQL:**
```sql
INSERT INTO "User" ("userId", "email", "createdAt", "updatedAt")
VALUES ('user-123', 'test@example.com', NOW(), NOW());

INSERT INTO "LinkedInAccount" (
  "linkedInAccountId", "userId", "profileUrl", "displayName",
  "validationStatus", "riskLevel", "createdAt", "updatedAt"
)
VALUES (
  'linkedin-123', 'user-123', 'https://linkedin.com/in/test',
  'Test User', 'CONNECTED', 'NORMAL', NOW(), NOW()
);
```

### 6. Configure Agent

```bash
cd apps/agent

# Create .env file (use IDs from step 5)
cat > .env << EOF
BACKEND_URL=http://localhost:3000
USER_ID=user-123
LINKEDIN_ACCOUNT_ID=linkedin-123
AGENT_VERSION=1.0.0
HEADLESS=false
BROWSER_TIMEOUT_MS=30000
EOF
```

### 7. Start Backend

```bash
cd apps/backend
npm run dev
```

**Verify:** Open http://localhost:3000/health

### 8. Start Agent

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

### 9. Create a Test Job

**Using Prisma Studio:**
```bash
cd apps/backend
npm run prisma:studio
```

Create a **Job**:
- `jobType`: `VISIT_PROFILE`
- `linkedInAccountId`: `linkedin-123`
- `state`: `PENDING`
- `parameters`: `{"profileUrl": "https://linkedin.com/in/test-profile"}`

### 10. Watch It Work!

The agent will:
1. Pull the job
2. Open browser (if HEADLESS=false)
3. Visit the profile
4. Report result
5. Upload screenshots

## Troubleshooting

### Playwright Issues

```bash
# Reinstall browsers
cd apps/agent
npm run playwright:install

# Test Playwright
npm run test:playwright
```

### Connection Issues

- Check backend is running: `curl http://localhost:3000/health`
- Verify `BACKEND_URL` in agent `.env`
- Check CORS in backend

### Registration Fails

- Verify User and LinkedInAccount exist
- Check IDs match in agent `.env`
- Check backend logs

## Next Steps

See `TESTING_GUIDE.md` for comprehensive testing scenarios.

