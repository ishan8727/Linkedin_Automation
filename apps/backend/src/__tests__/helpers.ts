/**
 * Test Helpers
 * 
 * Utility functions for creating test data
 */

import { PrismaClient } from '@prisma/client';
import services from '../domains';

const prisma = new PrismaClient();

export interface TestUser {
  userId: string;
  email: string;
  token: string;
}

export interface TestLinkedInAccount {
  linkedInAccountId: string;
  userId: string;
}

export interface TestAgent {
  agentId: string;
  linkedInAccountId: string;
  token: string;
}

/**
 * Create a test user
 */
export async function createTestUser(email?: string): Promise<TestUser> {
  const testEmail = email || `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
  try {
    const user = await services.authIdentity.createUser({ email: testEmail });
    const token = `user_${user.userId}`; // Simple token format for testing
    return { userId: user.userId, email: user.email, token };
  } catch (error: any) {
    // If user already exists, try to get it
    if (error.code === 'DUPLICATE_EMAIL' || error.message?.includes('already exists')) {
      const user = await services.authIdentity.getUserByEmail(testEmail);
      if (user) {
        const token = `user_${user.userId}`;
        return { userId: user.userId, email: user.email, token };
      }
    }
    throw error;
  }
}

/**
 * Create a test LinkedIn account
 */
export async function createTestLinkedInAccount(userId: string): Promise<TestLinkedInAccount> {
  const account = await services.linkedInAccount.createLinkedInAccount({
    userId,
    profileUrl: 'https://linkedin.com/in/test-profile',
    displayName: 'Test User',
    validationStatus: 'CONNECTED',
    healthStatus: 'HEALTHY',
    sessionValidAt: new Date(),
  });
  return { linkedInAccountId: account.linkedInAccountId, userId: account.userId };
}

/**
 * Create a test agent and generate token
 */
export async function createTestAgent(linkedInAccountId: string): Promise<TestAgent> {
  // Check if agent already exists
  let agent = await services.agentManagement.getAgentByLinkedInAccountId(linkedInAccountId);
  
  if (!agent || agent.deletedAt) {
    // Create new agent
    agent = await services.agentManagement.createAgent({
      linkedInAccountId,
      state: 'REGISTERED',
    });
  } else {
    // Update existing agent
    agent = await services.agentManagement.updateAgent(agent.agentId, {
      state: 'REGISTERED',
    });
  }
  
  const token = await services.agentManagement.generateAgentToken(agent.agentId, linkedInAccountId);
  return { agentId: agent.agentId, linkedInAccountId, token };
}

/**
 * Create a test job
 */
export async function createTestJob(
  linkedInAccountId: string,
  userId: string,
  jobType: string = 'VISIT_PROFILE',
  parameters: any = {}
): Promise<string> {
  const job = await services.jobExecution.createJob({
    linkedInAccountId,
    createdByUserId: userId,
    jobType,
    parameters: {
      leadId: `lead_${Date.now()}`,
      profileUrl: 'https://linkedin.com/in/test-lead',
      ...parameters,
    },
    state: 'PENDING',
    priority: 1,
  });
  return job.jobId;
}

/**
 * Clean up test data
 */
export async function cleanupTestData(): Promise<void> {
  try {
    // Delete in reverse order of dependencies
    await prisma.jobResult.deleteMany({});
    await prisma.job.deleteMany({});
    await prisma.violation.deleteMany({});
    await prisma.riskScore.deleteMany({});
    await prisma.agent.deleteMany({});
    await prisma.linkedInAccount.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.metric.deleteMany({});
    await prisma.rateLimitRule.deleteMany({});
  } catch (error) {
    // Ignore cleanup errors - data might not exist
    console.warn('Cleanup warning:', error);
  }
}

