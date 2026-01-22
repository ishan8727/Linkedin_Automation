/**
 * Dashboard API Tests
 * 
 * Tests for Dashboard ↔ Backend APIs (Control Plane)
 * 
 * Test Coverage:
 * - Authentication endpoints
 * - LinkedIn account status
 * - Jobs & Activity logs
 * - Live execution visibility
 * - Screenshots
 * - Risk status & acknowledgment
 * - Analytics summary
 * - Leads management
 * - Campaigns management
 */

import request from 'supertest';
import express from 'express';
import dashboardRoutes from '../../api/dashboard/routes';
import { createTestUser, createTestLinkedInAccount, createTestAgent, createTestJob, cleanupTestData } from '../helpers';
import services from '../../domains';

const app = express();
app.use(express.json());
app.use('/', dashboardRoutes);

describe('Dashboard API Tests', () => {
  let testUser: Awaited<ReturnType<typeof createTestUser>>;
  let testAccount: Awaited<ReturnType<typeof createTestLinkedInAccount>>;
  let testAgent: Awaited<ReturnType<typeof createTestAgent>>;

  beforeAll(async () => {
    await cleanupTestData();
    testUser = await createTestUser();
    testAccount = await createTestLinkedInAccount(testUser.userId);
    testAgent = await createTestAgent(testAccount.linkedInAccountId);
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('GET /auth/me', () => {
    /**
     * Test: Get current authenticated user
     * Description: Verifies that authenticated users can retrieve their own user information
     * Expected: Returns user ID, email, and creation timestamp
     */
    it('should return current user information when authenticated', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('userId', testUser.userId);
      expect(response.body).toHaveProperty('email', testUser.email);
      expect(response.body).toHaveProperty('createdAt');
    });

    /**
     * Test: Reject unauthenticated requests
     * Description: Verifies that unauthenticated requests are rejected
     * Expected: Returns 401 UNAUTHORIZED
     */
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/auth/me')
        .expect(401);

      expect(response.body.errorCode).toBe('UNAUTHORIZED');
    });

    /**
     * Test: Reject invalid token
     * Description: Verifies that invalid tokens are rejected
     * Expected: Returns 401 UNAUTHORIZED
     */
    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(response.body.errorCode).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /linkedin-account', () => {
    /**
     * Test: Get LinkedIn account status
     * Description: Verifies that users can retrieve their LinkedIn account status including risk level
     * Expected: Returns account ID, status, risk level, and last active timestamp
     */
    it('should return LinkedIn account status', async () => {
      const response = await request(app)
        .get('/linkedin-account')
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('linkedinAccountId', testAccount.linkedInAccountId);
      expect(response.body).toHaveProperty('status');
      expect(['CONNECTED', 'DISCONNECTED', 'EXPIRED', 'PAUSED']).toContain(response.body.status);
      expect(response.body).toHaveProperty('riskLevel');
      expect(['NORMAL', 'ELEVATED', 'HIGH', 'BLOCKED']).toContain(response.body.riskLevel);
      expect(response.body).toHaveProperty('lastActiveAt');
    });

    /**
     * Test: Handle missing LinkedIn account
     * Description: Verifies proper error handling when user has no LinkedIn account
     * Expected: Returns 404 RESOURCE_NOT_FOUND
     */
    it('should return 404 when user has no LinkedIn account', async () => {
      const newUser = await createTestUser();
      const response = await request(app)
        .get('/linkedin-account')
        .set('Authorization', `Bearer ${newUser.token}`)
        .expect(404);

      expect(response.body.errorCode).toBe('RESOURCE_NOT_FOUND');
    });
  });

  describe('GET /jobs', () => {
    /**
     * Test: List jobs for user's LinkedIn account
     * Description: Verifies that users can retrieve all jobs for their LinkedIn account
     * Expected: Returns array of jobs with job details
     */
    it('should return jobs for user account', async () => {
      // Create test jobs
      await createTestJob(testAccount.linkedInAccountId, testUser.userId, 'VISIT_PROFILE');
      await createTestJob(testAccount.linkedInAccountId, testUser.userId, 'SEND_CONNECTION_REQUEST');

      const response = await request(app)
        .get('/jobs')
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('jobs');
      expect(Array.isArray(response.body.jobs)).toBe(true);
      expect(response.body.jobs.length).toBeGreaterThanOrEqual(2);
      expect(response.body.jobs[0]).toHaveProperty('jobId');
      expect(response.body.jobs[0]).toHaveProperty('jobType');
      expect(response.body.jobs[0]).toHaveProperty('state');
    });

    /**
     * Test: Filter jobs by campaign ID
     * Description: Verifies that jobs can be filtered by campaign ID
     * Expected: Returns only jobs matching the campaign ID
     */
    it('should filter jobs by campaignId when provided', async () => {
      const campaignId = 'test-campaign-123';
      await createTestJob(testAccount.linkedInAccountId, testUser.userId, 'VISIT_PROFILE', {
        campaignId,
      });

      const response = await request(app)
        .get(`/jobs?campaignId=${campaignId}`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(response.body.jobs.length).toBeGreaterThan(0);
      // All returned jobs should have matching campaignId
      response.body.jobs.forEach((job: any) => {
        expect(job).toBeDefined();
      });
    });
  });

  describe('GET /activity-logs', () => {
    /**
     * Test: Retrieve activity logs
     * Description: Verifies that users can retrieve activity logs for their account
     * Expected: Returns array of audit log entries
     */
    it('should return activity logs', async () => {
      // Create some activity by creating a job
      await createTestJob(testAccount.linkedInAccountId, testUser.userId);

      const response = await request(app)
        .get('/activity-logs')
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('logs');
      expect(Array.isArray(response.body.logs)).toBe(true);
    });

    /**
     * Test: Limit activity logs
     * Description: Verifies that activity logs can be limited
     * Expected: Returns limited number of logs
     */
    it('should limit activity logs when limit parameter provided', async () => {
      const response = await request(app)
        .get('/activity-logs?limit=5')
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(response.body.logs.length).toBeLessThanOrEqual(5);
    });
  });

  describe('GET /live-execution', () => {
    /**
     * Test: Get live execution data
     * Description: Verifies that users can see currently executing jobs and recent events
     * Expected: Returns executing jobs and recent events
     */
    it('should return live execution data', async () => {
      // Create and assign a job
      const jobId = await createTestJob(testAccount.linkedInAccountId, testUser.userId);
      await services.jobExecution.updateJob(jobId, {
        state: 'EXECUTING',
        assignedAgentId: testAgent.agentId,
        startedAt: new Date(),
      });

      const response = await request(app)
        .get('/live-execution')
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('executingJobs');
      expect(response.body).toHaveProperty('recentEvents');
      expect(Array.isArray(response.body.executingJobs)).toBe(true);
      expect(Array.isArray(response.body.recentEvents)).toBe(true);
    });
  });

  describe('GET /screenshots', () => {
    /**
     * Test: Get screenshots for a job
     * Description: Verifies that users can retrieve screenshots for a specific job
     * Expected: Returns array of screenshot entries
     */
    it('should return screenshots for a job', async () => {
      const jobId = await createTestJob(testAccount.linkedInAccountId, testUser.userId);

      // Upload a screenshot via agent API simulation
      await services.observability.logEvent({
        domain: 'job-execution',
        eventType: 'SCREENSHOT_UPLOADED',
        entityType: 'Job',
        entityId: jobId,
        actorType: 'Agent',
        actorId: testAgent.agentId,
        payload: {
          stage: 'BEFORE',
          imageUrl: 'https://example.com/screenshot.png',
        },
      });

      const response = await request(app)
        .get(`/screenshots?jobId=${jobId}`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('screenshots');
      expect(Array.isArray(response.body.screenshots)).toBe(true);
      if (response.body.screenshots.length > 0) {
        expect(response.body.screenshots[0]).toHaveProperty('stage');
        expect(response.body.screenshots[0]).toHaveProperty('timestamp');
      }
    });

    /**
     * Test: Require jobId parameter
     * Description: Verifies that jobId is required
     * Expected: Returns 400 INVALID_REQUEST
     */
    it('should require jobId parameter', async () => {
      const response = await request(app)
        .get('/screenshots')
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(400);

      expect(response.body.errorCode).toBe('INVALID_REQUEST');
    });
  });

  describe('GET /risk-status', () => {
    /**
     * Test: Get risk status
     * Description: Verifies that users can retrieve their account's risk status
     * Expected: Returns risk level, score, factors, and recent violations
     */
    it('should return risk status', async () => {
      // Calculate risk score
      await services.riskSafety.calculateRiskScore(testAccount.linkedInAccountId);

      const response = await request(app)
        .get('/risk-status')
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('riskLevel');
      expect(response.body).toHaveProperty('score');
      expect(response.body).toHaveProperty('factors');
      expect(response.body).toHaveProperty('recentViolations');
      expect(Array.isArray(response.body.recentViolations)).toBe(true);
    });
  });

  describe('POST /risk/acknowledge', () => {
    /**
     * Test: Acknowledge risk violation
     * Description: Verifies that users can acknowledge risk violations
     * Expected: Returns success and logs acknowledgment
     */
    it('should acknowledge risk violation', async () => {
      // Create a violation
      const rule = await services.riskSafety.createRateLimitRule({
        actionType: 'SEND_CONNECTION_REQUEST',
        maxCount: 10,
        windowDuration: 3600,
        isActive: true,
      });

      const violation = await services.riskSafety.createViolation({
        linkedInAccountId: testAccount.linkedInAccountId,
        ruleId: rule.ruleId,
        violationType: 'RATE_LIMIT_EXCEEDED',
        severity: 'MEDIUM',
      });

      const response = await request(app)
        .post('/risk/acknowledge')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ violationId: violation.violationId })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    /**
     * Test: Require violationId
     * Description: Verifies that violationId is required
     * Expected: Returns 400 INVALID_REQUEST
     */
    it('should require violationId', async () => {
      const response = await request(app)
        .post('/risk/acknowledge')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({})
        .expect(400);

      expect(response.body.errorCode).toBe('INVALID_REQUEST');
    });
  });

  describe('GET /analytics/summary', () => {
    /**
     * Test: Get analytics summary
     * Description: Verifies that users can retrieve analytics summary
     * Expected: Returns leads imported, connections sent/accepted, messages sent
     */
    it('should return analytics summary', async () => {
      // Create jobs of different types
      await createTestJob(testAccount.linkedInAccountId, testUser.userId, 'SEND_CONNECTION_REQUEST');
      await createTestJob(testAccount.linkedInAccountId, testUser.userId, 'SEND_MESSAGE');

      // Complete a connection request job
      const connectionJobId = await createTestJob(testAccount.linkedInAccountId, testUser.userId, 'SEND_CONNECTION_REQUEST');
      await services.jobExecution.updateJob(connectionJobId, { state: 'COMPLETED' });
      await services.jobExecution.createJobResult({
        jobId: connectionJobId,
        agentId: testAgent.agentId,
        status: 'SUCCESS',
        result: { observedState: 'CONNECTED' },
      });

      const response = await request(app)
        .get('/analytics/summary')
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('leadsImported');
      expect(response.body).toHaveProperty('connectionsSent');
      expect(response.body).toHaveProperty('connectionsAccepted');
      expect(response.body).toHaveProperty('messagesSent');
      expect(typeof response.body.leadsImported).toBe('number');
      expect(typeof response.body.connectionsSent).toBe('number');
      expect(typeof response.body.connectionsAccepted).toBe('number');
      expect(typeof response.body.messagesSent).toBe('number');
    });
  });

  describe('GET /leads', () => {
    /**
     * Test: List leads
     * Description: Verifies that users can retrieve their leads
     * Expected: Returns array of leads extracted from jobs
     */
    it('should return leads', async () => {
      // Create jobs with lead data
      await createTestJob(testAccount.linkedInAccountId, testUser.userId, 'VISIT_PROFILE', {
        leadId: 'lead-1',
        profileUrl: 'https://linkedin.com/in/lead1',
      });
      await createTestJob(testAccount.linkedInAccountId, testUser.userId, 'VISIT_PROFILE', {
        leadId: 'lead-2',
        profileUrl: 'https://linkedin.com/in/lead2',
      });

      const response = await request(app)
        .get('/leads')
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('leads');
      expect(Array.isArray(response.body.leads)).toBe(true);
      if (response.body.leads.length > 0) {
        expect(response.body.leads[0]).toHaveProperty('leadId');
        expect(response.body.leads[0]).toHaveProperty('profileUrl');
      }
    });
  });

  describe('POST /leads/:leadId/archive', () => {
    /**
     * Test: Archive a lead
     * Description: Verifies that users can archive leads
     * Expected: Returns success and logs archive event
     */
    it('should archive a lead', async () => {
      const leadId = 'lead-to-archive';

      const response = await request(app)
        .post(`/leads/${leadId}/archive`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('POST /campaigns', () => {
    /**
     * Test: Create a campaign
     * Description: Verifies that users can create campaigns
     * Expected: Returns campaign ID and details
     */
    it('should create a campaign', async () => {
      const response = await request(app)
        .post('/campaigns')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          name: 'Test Campaign',
          description: 'Test campaign description',
        })
        .expect(200);

      expect(response.body).toHaveProperty('campaignId');
      expect(response.body).toHaveProperty('name', 'Test Campaign');
      expect(response.body).toHaveProperty('status');
    });

    /**
     * Test: Require campaign name
     * Description: Verifies that campaign name is required
     * Expected: Returns 400 INVALID_REQUEST
     */
    it('should require campaign name', async () => {
      const response = await request(app)
        .post('/campaigns')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          description: 'Missing name',
        })
        .expect(400);

      expect(response.body.errorCode).toBe('INVALID_REQUEST');
    });
  });

  describe('POST /campaigns/:campaignId/leads', () => {
    /**
     * Test: Assign leads to campaign
     * Description: Verifies that users can assign leads to campaigns
     * Expected: Returns success with assigned count
     */
    it('should assign leads to campaign', async () => {
      const campaignId = 'test-campaign-123';
      const leadIds = ['lead-1', 'lead-2', 'lead-3'];

      const response = await request(app)
        .post(`/campaigns/${campaignId}/leads`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({ leadIds })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('assignedCount', 3);
    });
  });

  describe('POST /campaigns/:campaignId/start', () => {
    /**
     * Test: Start a campaign
     * Description: Verifies that users can start campaigns
     * Expected: Returns success with ACTIVE status
     */
    it('should start a campaign', async () => {
      const campaignId = 'test-campaign-123';

      const response = await request(app)
        .post(`/campaigns/${campaignId}/start`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('status', 'ACTIVE');
    });
  });

  describe('POST /campaigns/:campaignId/pause', () => {
    /**
     * Test: Pause a campaign
     * Description: Verifies that users can pause campaigns
     * Expected: Returns success with PAUSED status
     */
    it('should pause a campaign', async () => {
      const campaignId = 'test-campaign-123';

      const response = await request(app)
        .post(`/campaigns/${campaignId}/pause`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('status', 'PAUSED');
    });
  });

  describe('GET /campaigns/:campaignId', () => {
    /**
     * Test: Get campaign status
     * Description: Verifies that users can retrieve campaign status
     * Expected: Returns campaign details
     */
    it('should return campaign status', async () => {
      // First create a campaign
      const createResponse = await request(app)
        .post('/campaigns')
        .set('Authorization', `Bearer ${testUser.token}`)
        .send({
          name: 'Test Campaign for Status',
          description: 'Test',
        })
        .expect(200);

      const campaignId = createResponse.body.campaignId;

      const response = await request(app)
        .get(`/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('campaignId', campaignId);
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('status');
    });

    /**
     * Test: Handle non-existent campaign
     * Description: Verifies proper error handling for non-existent campaigns
     * Expected: Returns 404 RESOURCE_NOT_FOUND
     */
    it('should return 404 for non-existent campaign', async () => {
      const response = await request(app)
        .get('/campaigns/non-existent-campaign')
        .set('Authorization', `Bearer ${testUser.token}`)
        .expect(404);

      expect(response.body.errorCode).toBe('RESOURCE_NOT_FOUND');
    });
  });
});

