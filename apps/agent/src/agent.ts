/**
 * Agent Main Loop
 * Phase 5: Agent Implementation
 * 
 * Execution Contract:
 * - Agent MAY: register, heartbeat, pull jobs, execute one job, report results, upload screenshots, stop on error
 * - Agent MUST NEVER: decide, retry, reorder, infer state, work offline, handle credentials, continue after refusal
 */

import { BrowserManager } from './browser/manager';
import { BackendClient } from './api/client';
import { config } from './config';
import { Job } from './types/api';
import { executeJob, JobHandlerContext } from './jobs/handlers';
import { bufferToBase64 } from './utils/screenshot';
import { randomDelay } from './utils/randomization';
import os from 'os';

export class Agent {
  private browser: BrowserManager;
  private api: BackendClient;
  private currentJob: Job | null = null;
  private isRunning: boolean = false;
  private executionAllowed: boolean = true;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private jobPollInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.browser = new BrowserManager();
    this.api = new BackendClient();
  }

  /**
   * Initialize agent and register with backend
   * Agent MAY: Register itself
   */
  async initialize(): Promise<void> {
    console.log('Initializing agent...');
    
    // Initialize browser
    await this.browser.initialize();
    console.log('Browser initialized');

    // Detect OS
    const platform = os.platform();
    let osType: 'macos' | 'windows' | 'linux';
    if (platform === 'darwin') osType = 'macos';
    else if (platform === 'win32') osType = 'windows';
    else osType = 'linux';

    // Register with backend
    const registerResponse = await this.api.register({
      userId: config.userId,
      linkedinAccountId: config.linkedinAccountId,
      agentVersion: config.agentVersion,
      browser: 'chromium',
      os: osType,
    });

    config.heartbeat.intervalSeconds = registerResponse.pollIntervalSeconds;
    console.log(`Agent registered. Poll interval: ${registerResponse.pollIntervalSeconds}s`);
  }

  /**
   * Start agent main loop
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Agent is already running');
      return;
    }

    this.isRunning = true;
    console.log('Agent started');

    // Start heartbeat loop
    this.startHeartbeat();

    // Start job polling loop
    this.startJobPolling();

    // Handle graceful shutdown
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
  }

  /**
   * Stop agent
   * Agent MUST: Stop immediately on error or when allowed = false
   */
  async stop(): Promise<void> {
    console.log('Stopping agent...');
    this.isRunning = false;

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.jobPollInterval) {
      clearInterval(this.jobPollInterval);
    }

    await this.browser.close();
    console.log('Agent stopped');
  }

  /**
   * Heartbeat loop
   * Agent MAY: Send heartbeat
   */
  private startHeartbeat(): void {
    const sendHeartbeat = async () => {
      if (!this.isRunning) return;

      try {
        const status = this.currentJob ? 'EXECUTING' : 'IDLE';
        const response = await this.api.heartbeat({
          linkedinAccountId: config.linkedinAccountId,
          status,
          currentJobId: this.currentJob?.jobId || null,
        });

        // Agent MUST: Stop if allowed = false
        if (!response.allowed) {
          console.warn(`Execution not allowed: ${response.reason}`);
          this.executionAllowed = false;
          
          // Stop current job if executing
          if (this.currentJob) {
            console.log('Stopping current job due to execution not allowed');
            this.currentJob = null;
          }
        } else {
          this.executionAllowed = true;
        }
      } catch (error: any) {
        console.error('Heartbeat error:', error.message);
        // Agent MUST: Stop on error
        this.executionAllowed = false;
      }
    };

    // Send initial heartbeat
    sendHeartbeat();

    // Set up interval
    this.heartbeatInterval = setInterval(
      sendHeartbeat,
      config.heartbeat.intervalSeconds * 1000
    );
  }

  /**
   * Job polling loop
   * Agent MAY: Pull jobs
   */
  private startJobPolling(): void {
    const pollJobs = async () => {
      if (!this.isRunning || !this.executionAllowed) return;
      if (this.currentJob) return; // Agent executes exactly one job at a time

      try {
        const response = await this.api.pullJobs(config.linkedinAccountId);
        
        if (response.jobs.length > 0) {
          // Agent executes exactly one job at a time
          const job = response.jobs[0];
          await this.executeJob(job);
        }
      } catch (error: any) {
        console.error('Job polling error:', error.message);
        // Agent MUST: Stop on error
        this.executionAllowed = false;
      }
    };

    // Poll immediately
    pollJobs();

    // Set up interval
    this.jobPollInterval = setInterval(
      pollJobs,
      config.jobPolling.intervalSeconds * 1000
    );
  }

  /**
   * Execute a single job
   * Agent executes exactly one job at a time
   */
  private async executeJob(job: Job): Promise<void> {
    this.currentJob = job;
    console.log(`Executing job ${job.jobId} (${job.type})`);

    try {
      // Check control state before execution (redundant check)
      const controlState = await this.api.checkControlState(config.linkedinAccountId);
      if (!controlState.executionAllowed) {
        console.warn(`Execution not allowed: ${controlState.reason}`);
        this.executionAllowed = false;
        this.currentJob = null;
        return;
      }

      // Log event: ACTION_STARTED
      await this.api.logEvent({
        jobId: job.jobId,
        eventType: 'ACTION_STARTED',
        message: `Starting ${job.type}`,
        timestamp: new Date().toISOString(),
      });

      // Wait for earliestExecutionTime if needed
      const earliestTime = new Date(job.earliestExecutionTime);
      const now = new Date();
      if (earliestTime > now) {
        const waitMs = earliestTime.getTime() - now.getTime();
        console.log(`Waiting ${waitMs}ms until earliest execution time`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
      }

      // Take BEFORE screenshot
      try {
        const screenshot = await this.browser.takeScreenshot();
        await this.api.uploadScreenshot({
          jobId: job.jobId,
          stage: 'BEFORE',
          imageBase64: bufferToBase64(screenshot),
        });
      } catch (error) {
        console.warn('Failed to upload BEFORE screenshot:', error);
      }

      // Execute job with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Job timeout')), job.timeoutSeconds * 1000);
      });

      const context: JobHandlerContext = {
        page: this.browser.getPage(),
        browser: this.browser,
        api: this.api,
        job,
      };

      const result = await Promise.race([
        executeJob(context),
        timeoutPromise,
      ]);

      // Take AFTER screenshot
      try {
        const screenshot = await this.browser.takeScreenshot();
        await this.api.uploadScreenshot({
          jobId: job.jobId,
          stage: result.status === 'SUCCESS' ? 'AFTER' : 'FAILURE',
          imageBase64: bufferToBase64(screenshot),
        });
      } catch (error) {
        console.warn('Failed to upload AFTER screenshot:', error);
      }

      // Report result
      await this.api.reportJobResult(job.jobId, {
        status: result.status,
        failureReason: result.failureReason || null,
        metadata: result.metadata,
      });

      // Log event: ACTION_COMPLETED
      await this.api.logEvent({
        jobId: job.jobId,
        eventType: 'ACTION_COMPLETED',
        message: `Completed ${job.type}: ${result.status}`,
        timestamp: new Date().toISOString(),
      });

      console.log(`Job ${job.jobId} completed: ${result.status}`);
    } catch (error: any) {
      console.error(`Job ${job.jobId} failed:`, error.message);

      // Take FAILURE screenshot
      try {
        const screenshot = await this.browser.takeScreenshot();
        await this.api.uploadScreenshot({
          jobId: job.jobId,
          stage: 'FAILURE',
          imageBase64: bufferToBase64(screenshot),
        });
      } catch (screenshotError) {
        console.warn('Failed to upload FAILURE screenshot:', screenshotError);
      }

      // Report failure
      const failureReason = error.message?.includes('timeout') ? 'TIMEOUT' : 'UNKNOWN';
      await this.api.reportJobResult(job.jobId, {
        status: 'FAILED',
        failureReason,
        metadata: { observedState: null },
      });

      // Log event: WARNING
      await this.api.logEvent({
        jobId: job.jobId,
        eventType: 'WARNING',
        message: `Job failed: ${error.message}`,
        timestamp: new Date().toISOString(),
      });

      // Agent MUST: Stop immediately on error
      this.executionAllowed = false;
    } finally {
      this.currentJob = null;
    }
  }
}

