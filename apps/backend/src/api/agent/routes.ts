import { Router, Request, Response } from 'express';
import { authenticateAgent, AuthRequest } from '../../middleware/auth';
import services from '../../domains';
import { AgentRegisterRequest, AgentRegisterResponse } from '../../types/api';
import { DomainError } from '../../domains/types';

/**
 * Agent ↔ Backend API Routes (Execution Plane)
 * 
 * Phase 4: Implementation
 */

const router = Router();

// POST /agent/register - NO authentication required (registration endpoint)
router.post('/register', async (req: Request, res: Response) => {
  try {
    const body: AgentRegisterRequest = req.body;
    
    // Validate request
    if (!body.userId || !body.linkedinAccountId || !body.agentVersion || !body.browser || !body.os) {
      res.status(400).json({
        errorCode: 'INVALID_REQUEST',
        message: 'Missing required fields: userId, linkedinAccountId, agentVersion, browser, os'
      });
      return;
    }

    // Validate LinkedInAccount exists and belongs to user
    const account = await services.linkedInAccount.getLinkedInAccountById(body.linkedinAccountId);
    if (!account) {
      res.status(404).json({
        errorCode: 'RESOURCE_NOT_FOUND',
        message: 'LinkedIn account not found'
      });
      return;
    }

    if (account.userId !== body.userId) {
      res.status(403).json({
        errorCode: 'FORBIDDEN',
        message: 'LinkedIn account does not belong to user'
      });
      return;
    }

    // Get or create agent (1:1 relationship)
    let agent = await services.agentManagement.getAgentByLinkedInAccountId(body.linkedinAccountId);
    
    if (!agent || agent.deletedAt) {
      // Create new agent
      agent = await services.agentManagement.createAgent({
        linkedInAccountId: body.linkedinAccountId,
        state: 'REGISTERED',
      });
    } else {
      // Update existing agent
      agent = await services.agentManagement.updateAgent(agent.agentId, {
        state: 'REGISTERED',
        lastHeartbeatAt: new Date(),
      });
    }

    // Generate agent token
    const agentToken = await services.agentManagement.generateAgentToken(
      agent.agentId,
      body.linkedinAccountId
    );

    // Log event
    await services.observability.logEvent({
      domain: 'agent-management',
      eventType: 'AGENT_REGISTERED',
      entityType: 'Agent',
      entityId: agent.agentId,
      actorType: 'Agent',
      actorId: agent.agentId,
      payload: {
        agentVersion: body.agentVersion,
        browser: body.browser,
        os: body.os,
      },
    });

    const response: AgentRegisterResponse = {
      agentToken,
      pollIntervalSeconds: 15,
    };

    res.json(response);
  } catch (error: any) {
    if (error instanceof DomainError) {
      res.status(400).json({
        errorCode: error.code,
        message: error.message,
      });
    } else {
      console.error('Agent registration error:', error);
      res.status(500).json({
        errorCode: 'INTERNAL_ERROR',
        message: 'Failed to register agent',
      });
    }
  }
});

// All other agent routes require agent authentication
router.use(authenticateAgent);

// POST /agent/heartbeat
router.post('/heartbeat', async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body;
    const linkedInAccountId = req.linkedInAccountId!;
    const agentId = req.agentId!;

    // Validate request
    if (!body.status || !['IDLE', 'EXECUTING', 'PAUSED'].includes(body.status)) {
      res.status(400).json({
        errorCode: 'INVALID_REQUEST',
        message: 'Invalid status. Must be IDLE, EXECUTING, or PAUSED'
      });
      return;
    }

    // Update agent heartbeat
    await services.agentManagement.updateAgent(agentId, {
      lastHeartbeatAt: new Date(),
      state: body.status === 'IDLE' ? 'IDLE' : body.status === 'EXECUTING' ? 'ACTIVE' : 'IDLE',
    });

    // Check if execution is allowed (risk safety veto)
    const executionCheck = await services.riskSafety.isExecutionAllowed(linkedInAccountId);

    // Log event
    await services.observability.logEvent({
      domain: 'agent-management',
      eventType: 'HEARTBEAT',
      entityType: 'Agent',
      entityId: agentId,
      actorType: 'Agent',
      actorId: agentId,
      payload: {
        status: body.status,
        currentJobId: body.currentJobId,
        executionAllowed: executionCheck.allowed,
      },
    });

    res.json({
      allowed: executionCheck.allowed,
      reason: executionCheck.reason,
    });
  } catch (error: any) {
    if (error instanceof DomainError) {
      res.status(400).json({
        errorCode: error.code,
        message: error.message,
      });
    } else {
      console.error('Heartbeat error:', error);
      res.status(500).json({
        errorCode: 'INTERNAL_ERROR',
        message: 'Failed to process heartbeat',
      });
    }
  }
});

// GET /agent/jobs
router.get('/jobs', async (req: AuthRequest, res: Response) => {
  try {
    const linkedInAccountId = req.linkedInAccountId!;
    const agentId = req.agentId!;

    // Get pending jobs for this LinkedIn account
    const jobs = await services.jobExecution.getJobsByLinkedInAccountId(linkedInAccountId, {
      state: 'PENDING',
      limit: 10, // Pull up to 10 jobs at a time
    });

    // Filter jobs that are ready to execute (earliestExecutionTime has passed)
    // For now, all pending jobs are ready (Phase 4: basic implementation)
    // Phase 4+: Add earliestExecutionTime check from job.parameters
    const readyJobs = jobs;

    // Assign jobs to agent
    const assignedJobs = [];
    for (const job of readyJobs.slice(0, 5)) { // Assign up to 5 jobs
      await services.jobExecution.updateJob(job.jobId, {
        state: 'ASSIGNED',
        assignedAgentId: agentId,
        assignedAt: new Date(),
      });

      // Extract job details from parameters
      const params = job.parameters as any;
      
      assignedJobs.push({
        jobId: job.jobId,
        type: job.jobType,
        leadId: params.leadId || job.jobId, // Fallback if leadId not in params
        payload: {
          profileUrl: params.profileUrl || null,
          messageText: params.messageText || null,
          noteText: params.noteText || null,
          postUrl: params.postUrl || null,
        },
        earliestExecutionTime: new Date().toISOString(), // Phase 4: basic - use current time
        timeoutSeconds: 120,
      });
    }

    res.json({ jobs: assignedJobs });
  } catch (error: any) {
    if (error instanceof DomainError) {
      res.status(400).json({
        errorCode: error.code,
        message: error.message,
      });
    } else {
      console.error('Pull jobs error:', error);
      res.status(500).json({
        errorCode: 'INTERNAL_ERROR',
        message: 'Failed to pull jobs',
      });
    }
  }
});

// POST /agent/jobs/:jobId/result
router.post('/jobs/:jobId/result', async (req: AuthRequest, res: Response) => {
  try {
    const jobId = req.params.jobId;
    const agentId = req.agentId!;
    const body = req.body;

    // Validate request
    if (!body.status || !['SUCCESS', 'FAILED', 'SKIPPED'].includes(body.status)) {
      res.status(400).json({
        errorCode: 'INVALID_REQUEST',
        message: 'Invalid status. Must be SUCCESS, FAILED, or SKIPPED'
      });
      return;
    }

    // Get job and verify it's assigned to this agent
    const job = await services.jobExecution.getJobById(jobId);
    if (!job) {
      res.status(404).json({
        errorCode: 'RESOURCE_NOT_FOUND',
        message: 'Job not found'
      });
      return;
    }

    if (job.assignedAgentId !== agentId) {
      res.status(403).json({
        errorCode: 'FORBIDDEN',
        message: 'Job is not assigned to this agent'
      });
      return;
    }

    if (job.state !== 'ASSIGNED' && job.state !== 'EXECUTING') {
      res.status(400).json({
        errorCode: 'INVALID_STATE',
        message: `Job is in ${job.state} state, cannot report result`
      });
      return;
    }

    // Check if result already exists (idempotency)
    const existingResult = await services.jobExecution.getJobResultByJobId(jobId);
    if (existingResult) {
      // Return existing result (idempotent)
      res.json({
        jobId,
        status: existingResult.status,
        message: 'Result already recorded',
      });
      return;
    }

    // Create job result
    const jobResult = await services.jobExecution.createJobResult({
      jobId,
      agentId,
      status: body.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
      result: body.metadata || {},
      errorMessage: body.failureReason || null,
    });

    // Update job state
    const newState = body.status === 'SUCCESS' ? 'COMPLETED' : 'FAILED';
    await services.jobExecution.updateJob(jobId, {
      state: newState,
      completedAt: new Date(),
      failureReason: body.status === 'FAILED' ? body.failureReason : null,
    });

    // Log event
    await services.observability.logEvent({
      domain: 'job-execution',
      eventType: 'JOB_RESULT_REPORTED',
      entityType: 'Job',
      entityId: jobId,
      actorType: 'Agent',
      actorId: agentId,
      payload: {
        status: body.status,
        failureReason: body.failureReason,
        metadata: body.metadata,
      },
    });

    res.json({
      jobId,
      status: jobResult.status,
      message: 'Job result recorded',
    });
  } catch (error: any) {
    if (error instanceof DomainError) {
      const statusCode = error.code === 'RESULT_EXISTS' ? 409 : 400;
      res.status(statusCode).json({
        errorCode: error.code,
        message: error.message,
      });
    } else {
      console.error('Report job result error:', error);
      res.status(500).json({
        errorCode: 'INTERNAL_ERROR',
        message: 'Failed to report job result',
      });
    }
  }
});

// POST /agent/events
router.post('/events', async (req: AuthRequest, res: Response) => {
  try {
    const agentId = req.agentId!;
    const body = req.body;

    // Validate request
    if (!body.jobId || !body.eventType || !body.message) {
      res.status(400).json({
        errorCode: 'INVALID_REQUEST',
        message: 'Missing required fields: jobId, eventType, message'
      });
      return;
    }

    if (!['ACTION_STARTED', 'ACTION_COMPLETED', 'WARNING', 'INFO'].includes(body.eventType)) {
      res.status(400).json({
        errorCode: 'INVALID_REQUEST',
        message: 'Invalid eventType'
      });
      return;
    }

    // Log event to observability
    await services.observability.logEvent({
      domain: 'job-execution',
      eventType: body.eventType,
      entityType: 'Job',
      entityId: body.jobId,
      actorType: 'Agent',
      actorId: agentId,
      payload: {
        message: body.message,
        timestamp: body.timestamp || new Date().toISOString(),
      },
    });

    // If ACTION_STARTED, update job state
    if (body.eventType === 'ACTION_STARTED') {
      const job = await services.jobExecution.getJobById(body.jobId);
      if (job && job.state === 'ASSIGNED') {
        await services.jobExecution.updateJob(body.jobId, {
          state: 'EXECUTING',
          startedAt: new Date(),
        });
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Execution event error:', error);
    res.status(500).json({
      errorCode: 'INTERNAL_ERROR',
      message: 'Failed to log execution event',
    });
  }
});

// POST /agent/screenshots
router.post('/screenshots', async (req: AuthRequest, res: Response) => {
  try {
    const agentId = req.agentId!;
    // Note: For Phase 4, we'll accept JSON with base64 image or URL
    // Phase 4+: Implement proper multipart/form-data handling
    
    const body = req.body;

    // Validate request
    if (!body.jobId || !body.stage) {
      res.status(400).json({
        errorCode: 'INVALID_REQUEST',
        message: 'Missing required fields: jobId, stage'
      });
      return;
    }

    if (!['BEFORE', 'AFTER', 'FAILURE'].includes(body.stage)) {
      res.status(400).json({
        errorCode: 'INVALID_REQUEST',
        message: 'Invalid stage. Must be BEFORE, AFTER, or FAILURE'
      });
      return;
    }

    // Log screenshot event (Phase 4: basic - store metadata)
    // Phase 4+: Store actual image file in S3/storage
    await services.observability.logEvent({
      domain: 'job-execution',
      eventType: 'SCREENSHOT_UPLOADED',
      entityType: 'Job',
      entityId: body.jobId,
      actorType: 'Agent',
      actorId: agentId,
      payload: {
        stage: body.stage,
        imageUrl: body.imageUrl || null, // Phase 4: basic - accept URL or base64
        imageBase64: body.imageBase64 || null,
      },
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Screenshot upload error:', error);
    res.status(500).json({
      errorCode: 'INTERNAL_ERROR',
      message: 'Failed to upload screenshot',
    });
  }
});

// GET /agent/control-state
router.get('/control-state', async (req: AuthRequest, res: Response) => {
  try {
    const linkedInAccountId = req.linkedInAccountId!;
    const queryLinkedInAccountId = req.query.linkedinAccountId as string;

    // Validate query parameter matches token
    if (queryLinkedInAccountId && queryLinkedInAccountId !== linkedInAccountId) {
      res.status(403).json({
        errorCode: 'FORBIDDEN',
        message: 'LinkedIn account ID does not match token'
      });
      return;
    }

    // Check if execution is allowed (risk safety veto)
    const executionCheck = await services.riskSafety.isExecutionAllowed(linkedInAccountId);

    res.json({
      executionAllowed: executionCheck.allowed,
      reason: executionCheck.reason,
    });
  } catch (error: any) {
    if (error instanceof DomainError) {
      res.status(400).json({
        errorCode: error.code,
        message: error.message,
      });
    } else {
      console.error('Control state check error:', error);
      res.status(500).json({
        errorCode: 'INTERNAL_ERROR',
        message: 'Failed to check control state',
      });
    }
  }
});

export default router;

