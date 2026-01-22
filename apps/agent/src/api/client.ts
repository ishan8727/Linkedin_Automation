/**
 * Backend API Client
 * Phase 5: Agent Implementation
 * 
 * Agent MUST NEVER: retry, reorder, decide, work offline
 * Agent MAY: register, heartbeat, pull jobs, execute, report results
 */

import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import {
  AgentRegisterRequest,
  AgentRegisterResponse,
  AgentHeartbeatRequest,
  AgentHeartbeatResponse,
  PullJobsResponse,
  JobResultRequest,
  ExecutionEventRequest,
  ScreenshotUploadRequest,
  ControlStateResponse,
  ApiErrorResponse,
} from '../types/api';

export class BackendClient {
  private client: AxiosInstance;
  private agentToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: config.backendUrl,
      timeout: 10000,
    });
  }

  setToken(token: string): void {
    this.agentToken = token;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Register agent with backend
   * Agent MAY: Register itself
   */
  async register(request: AgentRegisterRequest): Promise<AgentRegisterResponse> {
    const response = await this.client.post<AgentRegisterResponse>('/agent/register', request);
    this.setToken(response.data.agentToken);
    return response.data;
  }

  /**
   * Send heartbeat
   * Agent MAY: Send heartbeat
   */
  async heartbeat(request: AgentHeartbeatRequest): Promise<AgentHeartbeatResponse> {
    const response = await this.client.post<AgentHeartbeatResponse>('/agent/heartbeat', request);
    return response.data;
  }

  /**
   * Pull jobs
   * Agent MAY: Pull jobs
   */
  async pullJobs(linkedinAccountId: string): Promise<PullJobsResponse> {
    const response = await this.client.get<PullJobsResponse>('/agent/jobs', {
      params: { linkedinAccountId },
    });
    return response.data;
  }

  /**
   * Report job result
   * Agent MAY: Report factual results
   */
  async reportJobResult(jobId: string, result: JobResultRequest): Promise<void> {
    await this.client.post(`/agent/jobs/${jobId}/result`, result);
  }

  /**
   * Log execution event
   * Agent MAY: Report execution events
   */
  async logEvent(event: ExecutionEventRequest): Promise<void> {
    await this.client.post('/agent/events', event);
  }

  /**
   * Upload screenshot
   * Agent MAY: Upload screenshots
   */
  async uploadScreenshot(screenshot: ScreenshotUploadRequest): Promise<void> {
    await this.client.post('/agent/screenshots', screenshot);
  }

  /**
   * Check control state
   * Redundant check to ensure execution is still permitted
   */
  async checkControlState(linkedinAccountId: string): Promise<ControlStateResponse> {
    const response = await this.client.get<ControlStateResponse>('/agent/control-state', {
      params: { linkedinAccountId },
    });
    return response.data;
  }
}

