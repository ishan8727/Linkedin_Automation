# LinkedIn Automation Agent

**Phase 5: Agent Implementation**

Local Playwright-based executor that follows strict execution contract.

## Architecture

- **Backend decides** - Agent executes
- **Zero autonomy** - Agent never retries, reorders, or decides
- **Browser session on user's machine** - No credential storage

## Execution Contract

### Agent MAY:
- Register itself
- Send heartbeat
- Pull jobs
- Execute exactly one job at a time
- Report factual results
- Upload screenshots
- Stop immediately on error

### Agent MUST NEVER:
- Decide what to execute
- Retry jobs
- Reorder jobs
- Infer backend state
- Work offline
- Handle credentials
- Continue after refusal

## Setup

1. Install dependencies:
```bash
npm install
npm run playwright:install
```

2. Configure `.env`:
```bash
cp .env.example .env
# Edit .env with your USER_ID and LINKEDIN_ACCOUNT_ID
```

3. Run agent:
```bash
npm run dev
```

## Configuration

Required environment variables:
- `USER_ID` - Platform user ID
- `LINKEDIN_ACCOUNT_ID` - LinkedIn account ID to bind to
- `BACKEND_URL` - Backend API URL (default: http://localhost:3000)

Optional:
- `HEADLESS` - Run browser in headless mode (default: false)
- `BROWSER_TIMEOUT_MS` - Browser timeout in milliseconds (default: 30000)

## Job Types

- `VISIT_PROFILE` - Visit a LinkedIn profile
- `SEND_CONNECTION_REQUEST` - Send connection request
- `LIKE_POST` - Like a post
- `COMMENT_POST` - Comment on a post
- `SEND_MESSAGE` - Send a message

## Safety Features

- Heartbeat checks every 15 seconds (configurable)
- Stops immediately if `allowed = false` from heartbeat
- Respects `earliestExecutionTime` from backend
- Timeout handling per job
- Screenshot capture (before/after/failure)
- Event logging for observability

## Development

```bash
# Development mode (watch)
npm run dev

# Build
npm run build

# Production
npm start
```

## Notes

- Agent requires manual LinkedIn login in browser (first time)
- Browser session persists on user's machine
- Agent stops if backend revokes execution permission
- All state transitions happen in backend

