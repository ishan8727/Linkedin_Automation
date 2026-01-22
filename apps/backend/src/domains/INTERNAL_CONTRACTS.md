# Internal API Contracts

This document defines the internal service-to-service contracts between domains.

## Communication Pattern

**Direct Service Calls** (synchronous, preferred)
- Domain A calls Domain B's service method
- Domain B validates and performs the write
- Type-safe through TypeScript interfaces

**No Domain Events** (Phase 3: not needed, Phase 4: evaluate if async needed)

## Service Interfaces

All domains implement interfaces defined in `types.ts`:
- `IAuthIdentityService`
- `ILinkedInAccountService`
- `IAgentManagementService`
- `IJobExecutionService`
- `IRiskSafetyService`
- `IObservabilityService`

## Cross-Domain Read Operations

Domains can **read** from other domains through service interfaces:

### auth-identity → Others
- Can read: None (no dependencies)
- Writes: User only

### linkedin-account → Others
- Can read: User (via `authIdentity.getUserById()`)
- Writes: LinkedInAccount only

### agent-management → Others
- Can read: LinkedInAccount, User (via service interfaces)
- Writes: Agent, AgentToken only

### job-execution → Others
- Can read: LinkedInAccount, Agent, User (via service interfaces)
- Writes: Job, JobResult only

### risk-safety → Others
- Can read: LinkedInAccount, Job (via service interfaces)
- Writes: RateLimitRule, Violation, RiskScore only
- **Veto Power**: Can check `isExecutionAllowed()` but cannot directly stop execution

### observability → Others
- Can read: All tables (read-only, for logging)
- Writes: AuditLog, Metric only (append-only)
- **Never affects decisions**

## Error Handling

### Domain Errors
All domains throw `DomainError` with:
- `code`: Error code (e.g., 'USER_NOT_FOUND', 'BOUNDARY_VIOLATION')
- `message`: Human-readable message
- `domain`: Domain name

### Error Codes
- `USER_NOT_FOUND`: User does not exist
- `ACCOUNT_NOT_FOUND`: LinkedInAccount does not exist
- `AGENT_NOT_FOUND`: Agent does not exist
- `JOB_NOT_FOUND`: Job does not exist
- `RULE_NOT_FOUND`: RateLimitRule does not exist
- `DUPLICATE_EMAIL`: User with email already exists
- `AGENT_EXISTS`: Agent already exists for LinkedInAccount (1:1 constraint)
- `RESULT_EXISTS`: JobResult already exists for Job
- `CREATE_FAILED`: Generic create failure
- `UPDATE_FAILED`: Generic update failure
- `BOUNDARY_VIOLATION`: Attempted write to non-owned table

## Example Flows

### Flow 1: Agent Registration
1. **agent-management** receives registration request
2. **agent-management** reads LinkedInAccount (via `linkedInAccount.getLinkedInAccountById()`)
3. **agent-management** creates Agent (writes to Agent table)
4. **agent-management** generates AgentToken (writes to AgentToken - Phase 4: database)
5. **observability** logs event (via `observability.logEvent()`)

### Flow 2: Job Creation
1. **job-execution** receives job creation request
2. **job-execution** reads LinkedInAccount (via `linkedInAccount.getLinkedInAccountById()`)
3. **job-execution** reads User (via `authIdentity.getUserById()`)
4. **job-execution** creates Job (writes to Job table)
5. **observability** logs event (via `observability.logEvent()`)

### Flow 3: Risk Check Before Job Execution
1. **risk-safety** receives execution check request
2. **risk-safety** reads LinkedInAccount (via `linkedInAccount.getLinkedInAccountById()`)
3. **risk-safety** reads recent Violations (reads from Violation table - owned)
4. **risk-safety** calculates RiskScore (writes to RiskScore table)
5. **risk-safety** returns `{ allowed: boolean, reason: string | null }`
6. **job-execution** respects the veto (does not execute if `allowed = false`)

### Flow 4: Job Result Reporting
1. **job-execution** receives job result
2. **job-execution** reads Job (reads from Job table - owned)
3. **job-execution** reads Agent (via `agentManagement.getAgentById()`)
4. **job-execution** creates JobResult (writes to JobResult table)
5. **job-execution** updates Job state (writes to Job table)
6. **observability** logs event (via `observability.logEvent()`)

## Boundary Enforcement

### Type Safety
- All service methods are typed through interfaces
- TypeScript prevents direct database access outside services
- Service dependencies are injected through constructor

### Runtime Validation
- Services validate foreign key relationships before writes
- Services throw `DomainError` on validation failures
- Services check ownership before writes (implicit through service methods)

### Future: Database-Level Enforcement
- Phase 4: Consider database triggers or constraints
- Phase 4: Add database-level foreign key constraints

## Service Registry

All services are wired up in `domains/index.ts`:
- Singleton instances
- Circular dependencies resolved
- Available throughout application via `import services from './domains'`

## Testing Boundaries

To test domain boundaries:
1. Attempt to write to non-owned table → Should fail at TypeScript level
2. Attempt to call service method with invalid ID → Should throw `DomainError`
3. Attempt to create duplicate entity → Should throw `DomainError` with appropriate code

