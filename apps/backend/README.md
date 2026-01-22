# LinkedIn Automation Platform - Backend

## Phase 2 Status: Service Skeleton Complete ✅

This backend follows a strict domain-driven architecture with 6 internal domains.

## Project Structure

```
src/
├── domains/              # 6 internal domains (one service = one domain)
│   ├── auth-identity/
│   ├── linkedin-account/
│   ├── agent-management/
│   ├── job-execution/
│   ├── risk-safety/
│   ├── observability/
│   └── DOMAIN_OWNERSHIP.md
├── api/                  # External API routes
│   ├── agent/            # Agent ↔ Backend (Execution Plane)
│   └── dashboard/        # Dashboard ↔ Backend (Control Plane)
├── middleware/           # Express middleware
│   ├── auth.ts
│   └── error-handling.ts
├── types/                # TypeScript types
│   └── api.ts
├── lib/                  # Shared utilities
│   └── prisma.ts
└── index.ts              # Server entry point
```

## Domain Ownership

See `src/domains/DOMAIN_OWNERSHIP.md` for complete ownership matrix.

**Key Rule:** Each domain can ONLY write to its owned tables. Cross-domain writes must go through service interfaces.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create `.env` file (see `.env.example` for template):

```env
DATABASE_URL="postgresql://user:password@localhost:5432/linkedin?schema=public"
PORT=3000
NODE_ENV=development
```

### 3. Generate Prisma Client

```bash
npm run prisma:generate
```

### 4. Run Database Migrations

```bash
npm run prisma:migrate
```

### 5. Start Development Server

```bash
npm run dev
```

Server will run on `http://localhost:3000`

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Agent APIs (Execution Plane)
All routes under `/agent/*` - See `src/api/agent/routes.ts`
- Currently return `501 NOT_IMPLEMENTED` (Phase 4)

### Dashboard APIs (Control Plane)
All routes under `/*` - See `src/api/dashboard/routes.ts`
- Currently return `501 NOT_IMPLEMENTED` (Phase 4)

## Development Phases

- **Phase 2:** ✅ Service skeleton (current)
- **Phase 3:** Internal APIs & domain boundaries
- **Phase 4:** External API implementation
- **Phase 5:** Agent implementation
- **Phase 6:** Frontend dashboard

## Rules

1. **Never jump phases** - Complete each phase fully
2. **Respect domain ownership** - Each domain can only write to its tables
3. **No business logic in Phase 2** - Only skeleton structure
4. **Follow API contracts** - See `docs/API Contracts LinkedIn.md`

## Next Steps

Proceed to **Phase 3: Internal APIs** to:
- Define domain service interfaces
- Enforce write boundaries
- Establish cross-domain communication patterns

