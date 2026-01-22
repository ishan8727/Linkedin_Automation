/**
 * API Request/Response Types
 * 
 * Types based on API Contracts LinkedIn.md
 * Phase 2: Type definitions only - no implementation
 */

// ============================================================
// Agent ↔ Backend API Types (Execution Plane)
// ============================================================

export interface AgentRegisterRequest {
  userId: string;
  linkedinAccountId: string;
  agentVersion: string;
  browser: string;
  os: 'macos' | 'windows' | 'linux';
}

export interface AgentRegisterResponse {
  agentToken: string;
  pollIntervalSeconds: number;
}

export interface AgentHeartbeatRequest {
  linkedinAccountId: string;
  status: 'IDLE' | 'EXECUTING' | 'PAUSED';
  currentJobId: string | null;
}

export interface AgentHeartbeatResponse {
  allowed: boolean;
  reason: 'RISK_PAUSE' | 'USER_PAUSED' | 'SESSION_INVALID' | null;
}

export interface Job {
  jobId: string;
  type: 'VISIT_PROFILE' | 'SEND_CONNECTION_REQUEST' | 'LIKE_POST' | 'COMMENT_POST' | 'SEND_MESSAGE';
  leadId: string;
  payload: {
    profileUrl?: string;
    messageText?: string | null;
    noteText?: string | null;
    postUrl?: string | null;
  };
  earliestExecutionTime: string; // ISO-8601
  timeoutSeconds: number;
}

export interface PullJobsResponse {
  jobs: Job[];
}

export interface JobResultRequest {
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  failureReason: 'UI_CHANGED' | 'TIMEOUT' | 'SESSION_EXPIRED' | 'UNKNOWN' | null;
  metadata: {
    observedState: 'CONNECTED' | 'PENDING' | 'NONE' | null;
  };
}

export interface ExecutionEventRequest {
  jobId: string;
  eventType: 'ACTION_STARTED' | 'ACTION_COMPLETED' | 'WARNING' | 'INFO';
  message: string;
  timestamp: string; // ISO-8601
}

export interface ScreenshotUploadRequest {
  jobId: string;
  stage: 'BEFORE' | 'AFTER' | 'FAILURE';
}

export interface ControlStateResponse {
  executionAllowed: boolean;
  reason: 'USER_PAUSED' | 'RISK_PAUSE' | 'SESSION_INVALID' | null;
}

// ============================================================
// Dashboard ↔ Backend API Types (Control Plane)
// ============================================================

export interface LinkedInAccountStatusResponse {
  linkedinAccountId: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'EXPIRED' | 'PAUSED';
  riskLevel: 'NORMAL' | 'ELEVATED' | 'HIGH' | 'BLOCKED';
  lastActiveAt: string | null; // ISO-8601
}

export interface AnalyticsSummaryResponse {
  leadsImported: number;
  connectionsSent: number;
  connectionsAccepted: number;
  messagesSent: number;
}

// ============================================================
// Standard Error Response
// ============================================================

export interface ApiErrorResponse {
  errorCode: string;
  message: string;
}

