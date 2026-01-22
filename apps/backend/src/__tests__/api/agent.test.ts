/**
 * Agent API Tests
 * 
 * Tests for Agent ↔ Backend APIs (Execution Plane)
 * 
 * Test Coverage:
 * - Agent registration
 * - Heartbeat
 * - Pull jobs
 * - Report job result
 * - Execution events
 * - Screenshot upload
 * - Control state check
 */

import request from 'supertest';
import express from 'express';
import agentRoutes from '../../api/agent/routes';
import { createTestUser, createTestLinkedInAccount, createTestAgent, createTestJob, cleanupTestData } from '../helpers';
import services from '../../domains';

const app = express();
app.use(express.json());
app.use('/agent', agentRoutes);

describe('Agent API Tests', () => {
  let testUser: Awaited<ReturnType<typeof createTestUser>>;
  let testAccount: Awaited<ReturnType<typeof createTestLinkedInAccount>>;
  let testAgent: Awaited<ReturnType<typeof createTestAgent>>;

  beforeAll(async () => {
    await cleanupTestData();
    testUser = await createTestUser();
    testAccount = await createTestLinkedInAccount(testUser.userId);
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('POST /agent/register', () => {
    it('should register a new agent and return token', async () => {
      const response = await request(app)
        .post('/agent/register')
        .send({
          userId: testUser.userId,
          linkedinAccountId: testAccount.linkedInAccountId,
          agentVersion: '1.0.0',
          browser: 'chrome',
          os: 'linux',
        })
        .expect(200);

      expect(response.body).toHaveProperty('agentToken');
      expect(response.body).toHaveProperty('pollIntervalSeconds', 15);
      expect(response.body.agentToken).toBeTruthy();
    });

    it('should reject registration with invalid userId', async () => {
      const response = await request(app)
        .post('/agent/register')
        .send({
          userId: 'invalid-user-id',
          linkedinAccountId: testAccount.linkedInAccountId,
          agentVersion: '1.0.0',
          browser: 'chrome',
          os: 'linux',
        })
        .expect(403); // Changed to 403 because account ownership check happens first

      expect(response.body.errorCode).toBe('FORBIDDEN');
    });

    it('should reject registration with missing fields', async () => {
      const response = await request(app)
        .post('/agent/register')
        .send({
          userId: testUser.userId,
          // missing linkedinAccountId
        })
        .expect(400);

      expect(response.body.errorCode).toBe('INVALID_REQUEST');
    });
  });

  describe('POST /agent/heartbeat', () => {
    beforeEach(async () => {
      // Get or create agent
      let agent = await services.agentManagement.getAgentByLinkedInAccountId(testAccount.linkedInAccountId);
      if (!agent || agent.deletedAt) {
        testAgent = await createTestAgent(testAccount.linkedInAccountId);
      } else {
        const token = await services.agentManagement.generateAgentToken(agent.agentId, testAccount.linkedInAccountId);
        testAgent = { agentId: agent.agentId, linkedInAccountId: testAccount.linkedInAccountId, token };
      }
    });

    it('should accept heartbeat and return allowed status', async () => {
      const response = await request(app)
        .post('/agent/heartbeat')
        .set('Authorization', `Bearer ${testAgent.token}`)
        .send({
          linkedinAccountId: testAccount.linkedInAccountId,
          status: 'IDLE',
          currentJobId: null,
        })
        .expect(200);

      expect(response.body).toHaveProperty('allowed');
      expect(response.body).toHaveProperty('reason');
      expect(typeof response.body.allowed).toBe('boolean');
    });

    it('should reject heartbeat with invalid status', async () => {
      const response = await request(app)
        .post('/agent/heartbeat')
        .set('Authorization', `Bearer ${testAgent.token}`)
        .send({
          linkedinAccountId: testAccount.linkedInAccountId,
          status: 'INVALID_STATUS',
          currentJobId: null,
        })
        .expect(400);

      expect(response.body.errorCode).toBe('INVALID_REQUEST');
    });

    it('should reject heartbeat without authentication', async () => {
      const response = await request(app)
        .post('/agent/heartbeat')
        .send({
          linkedinAccountId: testAccount.linkedInAccountId,
          status: 'IDLE',
          currentJobId: null,
        })
        .expect(401);

      expect(response.body.errorCode).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /agent/jobs', () => {
    beforeEach(async () => {
      // Get or create agent
      let agent = await services.agentManagement.getAgentByLinkedInAccountId(testAccount.linkedInAccountId);
      if (!agent || agent.deletedAt) {
        testAgent = await createTestAgent(testAccount.linkedInAccountId);
      } else {
        const token = await services.agentManagement.generateAgentToken(agent.agentId, testAccount.linkedInAccountId);
        testAgent = { agentId: agent.agentId, linkedInAccountId: testAccount.linkedInAccountId, token };
      }
    });

    it('should return empty jobs array when no jobs available', async () => {
      const response = await request(app)
        .get('/agent/jobs')
        .set('Authorization', `Bearer ${testAgent.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('jobs');
      expect(Array.isArray(response.body.jobs)).toBe(true);
      expect(response.body.jobs.length).toBe(0);
    });

    it('should return pending jobs when available', async () => {
      // Create test jobs
      await createTestJob(testAccount.linkedInAccountId, testUser.userId, 'VISIT_PROFILE');
      await createTestJob(testAccount.linkedInAccountId, testUser.userId, 'SEND_CONNECTION_REQUEST');

      const response = await request(app)
        .get('/agent/jobs')
        .set('Authorization', `Bearer ${testAgent.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('jobs');
      expect(response.body.jobs.length).toBeGreaterThan(0);
      expect(response.body.jobs[0]).toHaveProperty('jobId');
      expect(response.body.jobs[0]).toHaveProperty('type');
      expect(response.body.jobs[0]).toHaveProperty('payload');
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/agent/jobs')
        .expect(401);

      expect(response.body.errorCode).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /agent/jobs/:jobId/result', () => {
    let jobId: string;

    beforeEach(async () => {
      // Get or create agent
      let agent = await services.agentManagement.getAgentByLinkedInAccountId(testAccount.linkedInAccountId);
      if (!agent || agent.deletedAt) {
        testAgent = await createTestAgent(testAccount.linkedInAccountId);
      } else {
        const token = await services.agentManagement.generateAgentToken(agent.agentId, testAccount.linkedInAccountId);
        testAgent = { agentId: agent.agentId, linkedInAccountId: testAccount.linkedInAccountId, token };
      }
      jobId = await createTestJob(testAccount.linkedInAccountId, testUser.userId, 'VISIT_PROFILE');
    });

    it('should accept job result and update job state', async () => {
      const response = await request(app)
        .post(`/agent/jobs/${jobId}/result`)
        .set('Authorization', `Bearer ${testAgent.token}`)
        .send({
          status: 'SUCCESS',
          failureReason: null,
          metadata: {
            observedState: 'CONNECTED',
          },
        })
        .expect(200);

      expect(response.body).toHaveProperty('jobId', jobId);
      expect(response.body).toHaveProperty('status', 'SUCCESS');
    });

    it('should handle idempotent result submission', async () => {
      // Submit result first time
      await request(app)
        .post(`/agent/jobs/${jobId}/result`)
        .set('Authorization', `Bearer ${testAgent.token}`)
        .send({
          status: 'SUCCESS',
          failureReason: null,
          metadata: {},
        })
        .expect(200);

      // Submit same result again (should be idempotent)
      const response = await request(app)
        .post(`/agent/jobs/${jobId}/result`)
        .set('Authorization', `Bearer ${testAgent.token}`)
        .send({
          status: 'SUCCESS',
          failureReason: null,
          metadata: {},
        })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Result already recorded');
    });

    it('should reject result with invalid status', async () => {
      const response = await request(app)
        .post(`/agent/jobs/${jobId}/result`)
        .set('Authorization', `Bearer ${testAgent.token}`)
        .send({
          status: 'INVALID_STATUS',
          failureReason: null,
          metadata: {},
        })
        .expect(400);

      expect(response.body.errorCode).toBe('INVALID_REQUEST');
    });

    it('should reject result for non-existent job', async () => {
      const response = await request(app)
        .post('/agent/jobs/non-existent-job-id/result')
        .set('Authorization', `Bearer ${testAgent.token}`)
        .send({
          status: 'SUCCESS',
          failureReason: null,
          metadata: {},
        })
        .expect(404);

      expect(response.body.errorCode).toBe('RESOURCE_NOT_FOUND');
    });
  });

  describe('POST /agent/events', () => {
    let jobId: string;

    beforeEach(async () => {
      // Get or create agent
      let agent = await services.agentManagement.getAgentByLinkedInAccountId(testAccount.linkedInAccountId);
      if (!agent || agent.deletedAt) {
        testAgent = await createTestAgent(testAccount.linkedInAccountId);
      } else {
        const token = await services.agentManagement.generateAgentToken(agent.agentId, testAccount.linkedInAccountId);
        testAgent = { agentId: agent.agentId, linkedInAccountId: testAccount.linkedInAccountId, token };
      }
      jobId = await createTestJob(testAccount.linkedInAccountId, testUser.userId, 'VISIT_PROFILE');
    });

    it('should log execution event', async () => {
      const response = await request(app)
        .post('/agent/events')
        .set('Authorization', `Bearer ${testAgent.token}`)
        .send({
          jobId,
          eventType: 'ACTION_STARTED',
          message: 'Starting profile visit',
          timestamp: new Date().toISOString(),
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should reject event with invalid eventType', async () => {
      const response = await request(app)
        .post('/agent/events')
        .set('Authorization', `Bearer ${testAgent.token}`)
        .send({
          jobId,
          eventType: 'INVALID_EVENT',
          message: 'Test message',
        })
        .expect(400);

      expect(response.body.errorCode).toBe('INVALID_REQUEST');
    });
  });

  describe('POST /agent/screenshots', () => {
    let jobId: string;

    beforeEach(async () => {
      // Get or create agent
      let agent = await services.agentManagement.getAgentByLinkedInAccountId(testAccount.linkedInAccountId);
      if (!agent || agent.deletedAt) {
        testAgent = await createTestAgent(testAccount.linkedInAccountId);
      } else {
        const token = await services.agentManagement.generateAgentToken(agent.agentId, testAccount.linkedInAccountId);
        testAgent = { agentId: agent.agentId, linkedInAccountId: testAccount.linkedInAccountId, token };
      }
      jobId = await createTestJob(testAccount.linkedInAccountId, testUser.userId, 'VISIT_PROFILE');
    });

    it('should accept screenshot upload', async () => {
      const response = await request(app)
        .post('/agent/screenshots')
        .set('Authorization', `Bearer ${testAgent.token}`)
        .send({
          jobId,
          stage: 'BEFORE',
          imageUrl: 'https://example.com/screenshot.png',
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should reject screenshot with invalid stage', async () => {
      const response = await request(app)
        .post('/agent/screenshots')
        .set('Authorization', `Bearer ${testAgent.token}`)
        .send({
          jobId,
          stage: 'INVALID_STAGE',
        })
        .expect(400);

      expect(response.body.errorCode).toBe('INVALID_REQUEST');
    });
  });

  describe('GET /agent/control-state', () => {
    beforeEach(async () => {
      // Get or create agent
      let agent = await services.agentManagement.getAgentByLinkedInAccountId(testAccount.linkedInAccountId);
      if (!agent || agent.deletedAt) {
        testAgent = await createTestAgent(testAccount.linkedInAccountId);
      } else {
        const token = await services.agentManagement.generateAgentToken(agent.agentId, testAccount.linkedInAccountId);
        testAgent = { agentId: agent.agentId, linkedInAccountId: testAccount.linkedInAccountId, token };
      }
    });

    it('should return control state', async () => {
      const response = await request(app)
        .get(`/agent/control-state?linkedinAccountId=${testAccount.linkedInAccountId}`)
        .set('Authorization', `Bearer ${testAgent.token}`)
        .expect(200);

      expect(response.body).toHaveProperty('executionAllowed');
      expect(response.body).toHaveProperty('reason');
      expect(typeof response.body.executionAllowed).toBe('boolean');
    });

    it('should reject request with mismatched account ID', async () => {
      const response = await request(app)
        .get('/agent/control-state?linkedinAccountId=different-account-id')
        .set('Authorization', `Bearer ${testAgent.token}`)
        .expect(403);

      expect(response.body.errorCode).toBe('FORBIDDEN');
    });
  });
});

