/**
 * API Types (shared with backend)
 * Phase 5: Agent Implementation
 */

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
  imageBase64?: string;
  imageUrl?: string;
}

export interface ControlStateResponse {
  executionAllowed: boolean;
  reason: 'USER_PAUSED' | 'RISK_PAUSE' | 'SESSION_INVALID' | null;
}

export interface ApiErrorResponse {
  errorCode: string;
  message: string;
}

