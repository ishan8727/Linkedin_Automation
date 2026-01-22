# Domain Ownership Matrix

This document defines which domain owns which database tables and their write permissions.

## Ownership Rules

1. Each domain can **ONLY write** to its owned tables
2. Domains can **READ** from other tables (for validation, lookups)
3. Observability domain is **append-only**, read-only for decisions
4. Cross-domain writes must go through the owning domain's service interface

## Domain Ownership

| Domain | Owns Tables | Write Permission | Read Permission |
|--------|-------------|------------------|-----------------|
| **auth-identity** | User | User only | All tables (for lookups) |
| **linkedin-account** | LinkedInAccount | LinkedInAccount only | User, Agent (for validation) |
| **agent-management** | Agent, AgentToken | Agent, AgentToken only | LinkedInAccount, User (for validation) |
| **job-execution** | Job, JobResult | Job, JobResult only | LinkedInAccount, Agent, User (for validation) |
| **risk-safety** | RateLimitRule, Violation, RiskScore | RateLimitRule, Violation, RiskScore only | Job, LinkedInAccount (for risk calculation) |
| **observability** | AuditLog, Metric | AuditLog, Metric only (append-only) | All tables (read-only, for logging) |

## Table Ownership Details

### User
- **Owner:** auth-identity
- **Can write:** auth-identity service only
- **Can read:** All domains (for user lookups)

### LinkedInAccount
- **Owner:** linkedin-account
- **Can write:** linkedin-account service only
- **Can read:** All domains (for account lookups)

### Agent
- **Owner:** agent-management
- **Can write:** agent-management service only
- **Can read:** All domains (for agent lookups)

### AgentToken
- **Owner:** agent-management
- **Can write:** agent-management service only
- **Can read:** agent-management, middleware (for validation)

### Job
- **Owner:** job-execution
- **Can write:** job-execution service only
- **Can read:** All domains (for job lookups)

### JobResult
- **Owner:** job-execution
- **Can write:** job-execution service only
- **Can read:** All domains (for result lookups)

### RateLimitRule
- **Owner:** risk-safety
- **Can write:** risk-safety service only
- **Can read:** All domains (for rule lookups)

### Violation
- **Owner:** risk-safety
- **Can write:** risk-safety service only
- **Can read:** All domains (for violation lookups)

### RiskScore
- **Owner:** risk-safety
- **Can write:** risk-safety service only
- **Can read:** All domains (for risk lookups)

### AuditLog
- **Owner:** observability
- **Can write:** observability service only (append-only)
- **Can read:** All domains (read-only)

### Metric
- **Owner:** observability
- **Can write:** observability service only (append-only)
- **Can read:** All domains (read-only)

## Cross-Domain Communication

When a domain needs to trigger a write in another domain:

1. **Direct service call** (preferred for synchronous operations)
   - Domain A calls Domain B's service method
   - Domain B validates and performs the write

2. **Domain events** (for async operations, if needed in Phase 3)
   - Domain A emits an event
   - Domain B listens and performs the write

## Example: Job Creation Flow

1. **job-execution** domain creates a Job
2. **risk-safety** domain reads the Job to check rate limits
3. **risk-safety** domain writes a Violation if limit exceeded
4. **observability** domain reads Job and Violation to log events
5. **observability** domain writes AuditLog entries (append-only)

## Enforcement

- Phase 3 will implement type-safe domain boundaries
- Service interfaces will enforce write permissions
- Direct database access outside of domain services is forbidden

