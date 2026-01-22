/**
 * Domain Types and Interfaces
 * 
 * Defines type-safe boundaries between domains.
 * Each domain can only write to its owned tables.
 */

import { User, LinkedInAccount, Agent, Job, JobResult, RateLimitRule, Violation, RiskScore, AuditLog, Metric } from '@prisma/client';

// ============================================================
// Domain Ownership Types
// ============================================================

/**
 * Domain 1: Auth & Identity
 * Owns: User
 */
export interface IAuthIdentityService {
  // User CRUD (write operations)
  createUser(data: { email: string }): Promise<User>;
  getUserById(userId: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  updateUser(userId: string, data: Partial<Pick<User, 'email'>>): Promise<User>;
  
  // Read operations (can read from other domains for validation)
  // No direct writes to other domains
}

/**
 * Domain 2: LinkedInAccount Management
 * Owns: LinkedInAccount
 */
export interface ILinkedInAccountService {
  // LinkedInAccount CRUD (write operations)
  createLinkedInAccount(data: {
    userId: string;
    profileUrl: string;
    displayName: string;
    validationStatus: string;
    healthStatus: string;
    sessionValidAt?: Date;
    metadata?: any;
  }): Promise<LinkedInAccount>;
  
  getLinkedInAccountById(linkedInAccountId: string): Promise<LinkedInAccount | null>;
  getLinkedInAccountByUserId(userId: string): Promise<LinkedInAccount | null>;
  
  updateLinkedInAccount(
    linkedInAccountId: string,
    data: Partial<Pick<LinkedInAccount, 'validationStatus' | 'healthStatus' | 'sessionValidAt' | 'metadata'>>
  ): Promise<LinkedInAccount>;
  
  // Read operations (can read User, Agent for validation)
  // No direct writes to other domains
}

/**
 * Domain 3: Agent Management
 * Owns: Agent, AgentToken
 */
export interface IAgentManagementService {
  // Agent CRUD (write operations)
  createAgent(data: {
    linkedInAccountId: string;
    state: string;
  }): Promise<Agent>;
  
  getAgentById(agentId: string): Promise<Agent | null>;
  getAgentByLinkedInAccountId(linkedInAccountId: string): Promise<Agent | null>;
  
  updateAgent(
    agentId: string,
    data: Partial<Pick<Agent, 'state' | 'lastHeartbeatAt' | 'terminatedAt' | 'deletedAt'>>
  ): Promise<Agent>;
  
  // AgentToken operations
  generateAgentToken(agentId: string, linkedInAccountId: string): Promise<string>;
  validateAgentToken(token: string): Promise<{ agentId: string; linkedInAccountId: string } | null>;
  revokeAgentToken(token: string): Promise<void>;
  
  // Read operations (can read LinkedInAccount, User for validation)
  // No direct writes to other domains
}

/**
 * Domain 4: Job & Execution Control
 * Owns: Job, JobResult
 */
export interface IJobExecutionService {
  // Job CRUD (write operations)
  createJob(data: {
    linkedInAccountId: string;
    createdByUserId: string;
    jobType: string;
    parameters: any;
    state: string;
    priority: number;
  }): Promise<Job>;
  
  getJobById(jobId: string): Promise<Job | null>;
  getJobsByLinkedInAccountId(linkedInAccountId: string, filters?: {
    state?: string;
    limit?: number;
  }): Promise<Job[]>;
  
  updateJob(
    jobId: string,
    data: Partial<Pick<Job, 'state' | 'assignedAgentId' | 'assignedAt' | 'startedAt' | 'completedAt' | 'failureReason' | 'deletedAt'>>
  ): Promise<Job>;
  
  // JobResult operations
  createJobResult(data: {
    jobId: string;
    agentId: string;
    status: string;
    result: any;
    errorMessage?: string;
  }): Promise<JobResult>;
  
  getJobResultByJobId(jobId: string): Promise<JobResult | null>;
  
  // Read operations (can read LinkedInAccount, Agent, User for validation)
  // No direct writes to other domains
}

/**
 * Domain 5: Risk & Safety
 * Owns: RateLimitRule, Violation, RiskScore
 */
export interface IRiskSafetyService {
  // RateLimitRule CRUD (write operations)
  createRateLimitRule(data: {
    actionType: string;
    maxCount: number;
    windowDuration: number;
    isActive: boolean;
  }): Promise<RateLimitRule>;
  
  getActiveRateLimitRules(actionType?: string): Promise<RateLimitRule[]>;
  
  // Violation operations
  createViolation(data: {
    linkedInAccountId: string;
    ruleId: string;
    jobId?: string;
    violationType: string;
    severity: string;
  }): Promise<Violation>;
  
  getViolationsByLinkedInAccountId(linkedInAccountId: string): Promise<Violation[]>;
  
  // RiskScore operations
  calculateRiskScore(linkedInAccountId: string): Promise<RiskScore>;
  getLatestRiskScore(linkedInAccountId: string): Promise<RiskScore | null>;
  
  // Veto power: Can check if execution is allowed
  isExecutionAllowed(linkedInAccountId: string): Promise<{ allowed: boolean; reason: string | null }>;
  
  // Read operations (can read Job, LinkedInAccount for risk calculation)
  // No direct writes to other domains (veto only)
}

/**
 * Domain 6: Observability & Audit
 * Owns: AuditLog, Metric
 * Append-only, read-only for decisions
 */
export interface IObservabilityService {
  // AuditLog operations (append-only)
  logEvent(data: {
    domain: string;
    eventType: string;
    entityType: string;
    entityId: string;
    actorType: string;
    actorId: string;
    payload: any;
  }): Promise<AuditLog>;
  
  getAuditLogs(filters?: {
    domain?: string;
    entityType?: string;
    entityId?: string;
    limit?: number;
  }): Promise<AuditLog[]>;
  
  // Metric operations (append-only)
  recordMetric(data: {
    metricName: string;
    metricValue: number;
    dimensions: any;
    aggregationWindow: string;
  }): Promise<Metric>;
  
  getMetrics(filters?: {
    metricName?: string;
    limit?: number;
  }): Promise<Metric[]>;
  
  // Read operations (can read all tables for logging)
  // No direct writes to other domains
  // Never affects decisions
}

// ============================================================
// Cross-Domain Communication Types
// ============================================================

/**
 * Service dependencies for cross-domain communication
 * Domains can read from other domains but must use service interfaces
 */
export interface IDomainServices {
  authIdentity: IAuthIdentityService;
  linkedInAccount: ILinkedInAccountService;
  agentManagement: IAgentManagementService;
  jobExecution: IJobExecutionService;
  riskSafety: IRiskSafetyService;
  observability: IObservabilityService;
}

/**
 * Domain error types
 */
export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly domain: string
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export class DomainBoundaryViolationError extends DomainError {
  constructor(
    domain: string,
    public readonly attemptedWrite: string,
    public readonly ownedBy: string
  ) {
    super(
      'BOUNDARY_VIOLATION',
      `Domain ${domain} attempted to write to ${attemptedWrite} which is owned by ${ownedBy}`,
      domain
    );
  }
}

