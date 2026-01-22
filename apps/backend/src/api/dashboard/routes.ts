import { Router, Request, Response } from 'express';
import { authenticateUser, AuthRequest } from '../../middleware/auth';
import services from '../../domains';

/**
 * Dashboard ↔ Backend API Routes (Control Plane)
 * 
 * Phase 4: Implementation
 */

const router = Router();

// Authentication
// Note: Login is handled by auth provider (Clerk, Auth0, etc.)
// This endpoint is for token exchange or validation
router.post('/auth/login', async (_req: Request, res: Response) => {
  // Phase 4: Basic implementation
  // TODO: Integrate with actual auth provider
  res.status(501).json({ 
    errorCode: 'NOT_IMPLEMENTED', 
    message: 'Login handled by auth provider. Use provider SDK for authentication.' 
  });
});

router.get('/auth/me', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const user = await services.authIdentity.getUserById(userId);
    
    if (!user) {
      res.status(404).json({
        errorCode: 'RESOURCE_NOT_FOUND',
        message: 'User not found'
      });
      return;
    }

    res.json({
      userId: user.userId,
      email: user.email,
      createdAt: user.createdAt,
    });
  } catch (error: any) {
    console.error('Get current user error:', error);
    res.status(500).json({
      errorCode: 'INTERNAL_ERROR',
      message: 'Failed to get current user',
    });
  }
});

// LinkedIn Account
router.get('/linkedin-account', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    
    // Get user's LinkedIn account
    const account = await services.linkedInAccount.getLinkedInAccountByUserId(userId);
    
    if (!account) {
      res.status(404).json({
        errorCode: 'RESOURCE_NOT_FOUND',
        message: 'LinkedIn account not found'
      });
      return;
    }

    // Get latest risk score
    const riskScore = await services.riskSafety.getLatestRiskScore(account.linkedInAccountId);
    
    // Get agent last heartbeat
    const agent = await services.agentManagement.getAgentByLinkedInAccountId(account.linkedInAccountId);
    const lastActiveAt = agent?.lastHeartbeatAt || null;

    // Map validation status to API status
    let status: 'CONNECTED' | 'DISCONNECTED' | 'EXPIRED' | 'PAUSED' = 'DISCONNECTED';
    if (account.validationStatus === 'CONNECTED') {
      status = 'CONNECTED';
    } else if (account.validationStatus === 'EXPIRED') {
      status = 'EXPIRED';
    } else if (account.healthStatus === 'SUSPENDED') {
      status = 'PAUSED';
    }

    // Map risk level
    const riskLevel = riskScore?.riskLevel || 'NORMAL';
    const apiRiskLevel: 'NORMAL' | 'ELEVATED' | 'HIGH' | 'BLOCKED' = 
      riskLevel === 'LOW' ? 'NORMAL' :
      riskLevel === 'MEDIUM' ? 'ELEVATED' :
      riskLevel === 'HIGH' ? 'HIGH' : 'BLOCKED';

    res.json({
      linkedinAccountId: account.linkedInAccountId,
      status,
      riskLevel: apiRiskLevel,
      lastActiveAt: lastActiveAt?.toISOString() || null,
    });
  } catch (error: any) {
    console.error('Get LinkedIn account error:', error);
    res.status(500).json({
      errorCode: 'INTERNAL_ERROR',
      message: 'Failed to get LinkedIn account status',
    });
  }
});

// Leads
// Phase 4: Basic implementation - leads are stored in job.parameters
// Phase 4+: Create separate Lead model
router.post('/leads/import', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    // Phase 4: Basic - CSV import not fully implemented
    // For now, accept JSON array of leads
    const leads = req.body.leads || [];
    
    if (!Array.isArray(leads) || leads.length === 0) {
      res.status(400).json({
        errorCode: 'INVALID_REQUEST',
        message: 'leads array is required'
      });
      return;
    }

    // Phase 4: Store leads by creating placeholder jobs
    // Phase 4+: Create actual Lead entities
    res.status(501).json({
      errorCode: 'NOT_IMPLEMENTED',
      message: 'Lead import will create Lead entities in Phase 4+. For now, leads are created with jobs.'
    });
  } catch (error: any) {
    console.error('Import leads error:', error);
    res.status(500).json({
      errorCode: 'INTERNAL_ERROR',
      message: 'Failed to import leads',
    });
  }
});

router.get('/leads', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    // Phase 4: Basic - extract leads from jobs
    // Phase 4+: Query Lead table
    const userId = req.userId!;
    const account = await services.linkedInAccount.getLinkedInAccountByUserId(userId);
    if (!account) {
      res.status(404).json({
        errorCode: 'RESOURCE_NOT_FOUND',
        message: 'LinkedIn account not found'
      });
      return;
    }

    const jobs = await services.jobExecution.getJobsByLinkedInAccountId(account.linkedInAccountId, {
      limit: 1000,
    });

    // Extract unique leads from jobs
    const leadMap = new Map();
    jobs.forEach(job => {
      const params = job.parameters as any;
      if (params.leadId && params.profileUrl) {
        if (!leadMap.has(params.leadId)) {
          leadMap.set(params.leadId, {
            leadId: params.leadId,
            profileUrl: params.profileUrl,
            jobCount: 0,
          });
        }
        leadMap.get(params.leadId).jobCount++;
      }
    });

    res.json({
      leads: Array.from(leadMap.values()),
    });
  } catch (error: any) {
    console.error('List leads error:', error);
    res.status(500).json({
      errorCode: 'INTERNAL_ERROR',
      message: 'Failed to list leads',
    });
  }
});

router.post('/leads/:leadId/archive', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    // Phase 4: Basic - archive by updating jobs
    // Phase 4+: Update Lead entity
    const leadId = req.params.leadId;
    
    await services.observability.logEvent({
      domain: 'job-execution',
      eventType: 'LEAD_ARCHIVED',
      entityType: 'Lead',
      entityId: leadId,
      actorType: 'User',
      actorId: req.userId!,
      payload: {},
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Archive lead error:', error);
    res.status(500).json({
      errorCode: 'INTERNAL_ERROR',
      message: 'Failed to archive lead',
    });
  }
});

// Campaigns
// Phase 4: Basic implementation - campaigns stored in job.parameters
// Phase 4+: Create Campaign model
router.post('/campaigns', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { name, description } = req.body;

    if (!name) {
      res.status(400).json({
        errorCode: 'INVALID_REQUEST',
        message: 'Campaign name is required'
      });
      return;
    }

    // Phase 4: Basic - generate campaign ID and store in metadata
    // Phase 4+: Create Campaign entity
    const campaignId = `campaign_${Date.now()}`;

    await services.observability.logEvent({
      domain: 'job-execution',
      eventType: 'CAMPAIGN_CREATED',
      entityType: 'Campaign',
      entityId: campaignId,
      actorType: 'User',
      actorId: userId,
      payload: { name, description },
    });

    res.json({
      campaignId,
      name,
      description,
      status: 'DRAFT',
    });
  } catch (error: any) {
    console.error('Create campaign error:', error);
    res.status(500).json({
      errorCode: 'INTERNAL_ERROR',
      message: 'Failed to create campaign',
    });
  }
});

router.post('/campaigns/:campaignId/leads', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const campaignId = req.params.campaignId;
    const leadIds = req.body.leadIds || [];

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      res.status(400).json({
        errorCode: 'INVALID_REQUEST',
        message: 'leadIds array is required'
      });
      return;
    }

    // Phase 4: Basic - log assignment
    // Phase 4+: Create jobs for leads
    await services.observability.logEvent({
      domain: 'job-execution',
      eventType: 'LEADS_ASSIGNED_TO_CAMPAIGN',
      entityType: 'Campaign',
      entityId: campaignId,
      actorType: 'User',
      actorId: req.userId!,
      payload: { leadIds },
    });

    res.json({ success: true, assignedCount: leadIds.length });
  } catch (error: any) {
    console.error('Assign leads to campaign error:', error);
    res.status(500).json({
      errorCode: 'INTERNAL_ERROR',
      message: 'Failed to assign leads to campaign',
    });
  }
});

router.post('/campaigns/:campaignId/start', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const campaignId = req.params.campaignId;
    const userId = req.userId!;

    // Phase 4: Basic - log start event
    // Phase 4+: Update campaign status and create jobs
    await services.observability.logEvent({
      domain: 'job-execution',
      eventType: 'CAMPAIGN_STARTED',
      entityType: 'Campaign',
      entityId: campaignId,
      actorType: 'User',
      actorId: userId,
      payload: {},
    });

    res.json({ success: true, status: 'ACTIVE' });
  } catch (error: any) {
    console.error('Start campaign error:', error);
    res.status(500).json({
      errorCode: 'INTERNAL_ERROR',
      message: 'Failed to start campaign',
    });
  }
});

router.post('/campaigns/:campaignId/pause', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const campaignId = req.params.campaignId;
    const userId = req.userId!;

    // Phase 4: Basic - log pause event
    // Phase 4+: Update campaign status and pause jobs
    await services.observability.logEvent({
      domain: 'job-execution',
      eventType: 'CAMPAIGN_PAUSED',
      entityType: 'Campaign',
      entityId: campaignId,
      actorType: 'User',
      actorId: userId,
      payload: {},
    });

    res.json({ success: true, status: 'PAUSED' });
  } catch (error: any) {
    console.error('Pause campaign error:', error);
    res.status(500).json({
      errorCode: 'INTERNAL_ERROR',
      message: 'Failed to pause campaign',
    });
  }
});

router.get('/campaigns/:campaignId', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const campaignId = req.params.campaignId;

    // Phase 4: Basic - get campaign info from logs
    // Phase 4+: Query Campaign entity
    const logs = await services.observability.getAuditLogs({
      entityType: 'Campaign',
      entityId: campaignId,
      limit: 1,
    });

    if (logs.length === 0) {
      res.status(404).json({
        errorCode: 'RESOURCE_NOT_FOUND',
        message: 'Campaign not found'
      });
      return;
    }

    const createLog = logs.find(l => l.eventType === 'CAMPAIGN_CREATED');
    const payload = createLog?.payload as any || {};

    res.json({
      campaignId,
      name: payload.name,
      description: payload.description,
      status: 'ACTIVE', // Phase 4: Basic
    });
  } catch (error: any) {
    console.error('Get campaign status error:', error);
    res.status(500).json({
      errorCode: 'INTERNAL_ERROR',
      message: 'Failed to get campaign status',
    });
  }
});

// Jobs & Activity
router.get('/jobs', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const campaignId = req.query.campaignId as string | undefined;

    // Get user's LinkedIn account
    const account = await services.linkedInAccount.getLinkedInAccountByUserId(userId);
    if (!account) {
      res.status(404).json({
        errorCode: 'RESOURCE_NOT_FOUND',
        message: 'LinkedIn account not found'
      });
      return;
    }

    // Get jobs for this account
    // Phase 4: Basic - filter by campaignId if provided (stored in job.parameters)
    const jobs = await services.jobExecution.getJobsByLinkedInAccountId(account.linkedInAccountId, {
      limit: 100,
    });

    // Filter by campaignId if provided
    const filteredJobs = campaignId 
      ? jobs.filter(job => {
          const params = job.parameters as any;
          return params.campaignId === campaignId;
        })
      : jobs;

    res.json({
      jobs: filteredJobs.map(job => ({
        jobId: job.jobId,
        jobType: job.jobType,
        state: job.state,
        priority: job.priority,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        failureReason: job.failureReason,
      })),
    });
  } catch (error: any) {
    console.error('List jobs error:', error);
    res.status(500).json({
      errorCode: 'INTERNAL_ERROR',
      message: 'Failed to list jobs',
    });
  }
});

router.get('/activity-logs', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const limit = parseInt(req.query.limit as string) || 100;

    // Get audit logs for user's entities
    // Phase 4: Basic - get all logs, filter by user's entities
    const logs = await services.observability.getAuditLogs({
      limit,
    });

    // Filter logs related to this user
    const userLogs = logs.filter(log => {
      // Check if log is related to user's entities
      // Phase 4: Basic filtering
      return log.actorId === userId || log.entityId === userId;
    });

    res.json({
      logs: userLogs.map(log => ({
        logId: log.logId,
        domain: log.domain,
        eventType: log.eventType,
        entityType: log.entityType,
        entityId: log.entityId,
        actorType: log.actorType,
        actorId: log.actorId,
        payload: log.payload,
        timestamp: log.timestamp,
      })),
    });
  } catch (error: any) {
    console.error('Get activity logs error:', error);
    res.status(500).json({
      errorCode: 'INTERNAL_ERROR',
      message: 'Failed to get activity logs',
    });
  }
});

router.get('/live-execution', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    
    // Get user's LinkedIn account
    const account = await services.linkedInAccount.getLinkedInAccountByUserId(userId);
    if (!account) {
      res.status(404).json({
        errorCode: 'RESOURCE_NOT_FOUND',
        message: 'LinkedIn account not found'
      });
      return;
    }

    // Get currently executing jobs
    const executingJobs = await services.jobExecution.getJobsByLinkedInAccountId(account.linkedInAccountId, {
      state: 'EXECUTING',
      limit: 10,
    });

    // Get recent events for these jobs
    const recentEvents = await services.observability.getAuditLogs({
      entityType: 'Job',
      limit: 50,
    });

    res.json({
      executingJobs: executingJobs.map(job => ({
        jobId: job.jobId,
        jobType: job.jobType,
        startedAt: job.startedAt,
      })),
      recentEvents: recentEvents
        .filter(e => executingJobs.some(j => j.jobId === e.entityId))
        .slice(0, 20)
        .map(e => ({
          eventType: e.eventType,
          message: (e.payload as any).message,
          timestamp: e.timestamp,
        })),
    });
  } catch (error: any) {
    console.error('Get live execution error:', error);
    res.status(500).json({
      errorCode: 'INTERNAL_ERROR',
      message: 'Failed to get live execution data',
    });
  }
});

router.get('/screenshots', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const jobId = req.query.jobId as string;
    
    if (!jobId) {
      res.status(400).json({
        errorCode: 'INVALID_REQUEST',
        message: 'jobId query parameter is required'
      });
      return;
    }

    // Get screenshot events for this job
    const events = await services.observability.getAuditLogs({
      entityType: 'Job',
      entityId: jobId,
      limit: 100,
    });

    const screenshotEvents = events.filter(e => e.eventType === 'SCREENSHOT_UPLOADED');

    res.json({
      screenshots: screenshotEvents.map(e => ({
        stage: (e.payload as any).stage,
        imageUrl: (e.payload as any).imageUrl,
        timestamp: e.timestamp,
      })),
    });
  } catch (error: any) {
    console.error('Get screenshots error:', error);
    res.status(500).json({
      errorCode: 'INTERNAL_ERROR',
      message: 'Failed to get screenshots',
    });
  }
});

// Risk & Analytics
router.get('/risk-status', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    
    // Get user's LinkedIn account
    const account = await services.linkedInAccount.getLinkedInAccountByUserId(userId);
    if (!account) {
      res.status(404).json({
        errorCode: 'RESOURCE_NOT_FOUND',
        message: 'LinkedIn account not found'
      });
      return;
    }

    // Get latest risk score
    const riskScore = await services.riskSafety.getLatestRiskScore(account.linkedInAccountId);
    
    // Get recent violations
    const violations = await services.riskSafety.getViolationsByLinkedInAccountId(account.linkedInAccountId);
    const recentViolations = violations.slice(0, 10);

    res.json({
      riskLevel: riskScore?.riskLevel || 'LOW',
      score: riskScore?.score || 0,
      factors: riskScore?.factors || {},
      recentViolations: recentViolations.map(v => ({
        violationId: v.violationId,
        violationType: v.violationType,
        severity: v.severity,
        detectedAt: v.detectedAt,
        resolvedAt: v.resolvedAt,
      })),
    });
  } catch (error: any) {
    console.error('Get risk status error:', error);
    res.status(500).json({
      errorCode: 'INTERNAL_ERROR',
      message: 'Failed to get risk status',
    });
  }
});

router.post('/risk/acknowledge', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const violationId = req.body.violationId;

    if (!violationId) {
      res.status(400).json({
        errorCode: 'INVALID_REQUEST',
        message: 'violationId is required'
      });
      return;
    }

    // Phase 4: Basic acknowledgment - log event
    // Phase 4+: Update violation status
    await services.observability.logEvent({
      domain: 'risk-safety',
      eventType: 'RISK_ACKNOWLEDGED',
      entityType: 'Violation',
      entityId: violationId,
      actorType: 'User',
      actorId: userId,
      payload: {
        acknowledgedAt: new Date().toISOString(),
      },
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Acknowledge risk error:', error);
    res.status(500).json({
      errorCode: 'INTERNAL_ERROR',
      message: 'Failed to acknowledge risk',
    });
  }
});

router.get('/analytics/summary', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    
    // Get user's LinkedIn account
    const account = await services.linkedInAccount.getLinkedInAccountByUserId(userId);
    if (!account) {
      res.status(404).json({
        errorCode: 'RESOURCE_NOT_FOUND',
        message: 'LinkedIn account not found'
      });
      return;
    }

    // Get all jobs for this account
    const allJobs = await services.jobExecution.getJobsByLinkedInAccountId(account.linkedInAccountId, {
      limit: 1000,
    });

    // Calculate analytics
    const connectionsSent = allJobs.filter(j => j.jobType === 'SEND_CONNECTION_REQUEST' && j.state === 'COMPLETED').length;
    const messagesSent = allJobs.filter(j => j.jobType === 'SEND_MESSAGE' && j.state === 'COMPLETED').length;
    
    // Get job results to count accepted connections
    let connectionsAccepted = 0;
    for (const job of allJobs.filter(j => j.jobType === 'SEND_CONNECTION_REQUEST')) {
      const result = await services.jobExecution.getJobResultByJobId(job.jobId);
      if (result && result.status === 'SUCCESS') {
        const resultData = result.result as any;
        if (resultData.observedState === 'CONNECTED') {
          connectionsAccepted++;
        }
      }
    }

    // Phase 4: Basic - leads imported count from jobs
    // Phase 4+: Store leads separately
    const leadsImported = new Set(
      allJobs.map(j => {
        const params = j.parameters as any;
        return params.leadId;
      }).filter(Boolean)
    ).size;

    res.json({
      leadsImported,
      connectionsSent,
      connectionsAccepted,
      messagesSent,
    });
  } catch (error: any) {
    console.error('Get analytics summary error:', error);
    res.status(500).json({
      errorCode: 'INTERNAL_ERROR',
      message: 'Failed to get analytics summary',
    });
  }
});

export default router;

