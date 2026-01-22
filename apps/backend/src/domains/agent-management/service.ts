/**
 * Domain 3: Agent Management Service
 * 
 * Owns: Agent, AgentToken
 * Responsibilities: Agent registration, token management, heartbeat
 * 
 * Phase 3: Service interface implementation
 */

import { Agent } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { IAgentManagementService, IDomainServices } from '../types';
import { DomainError } from '../types';
import crypto from 'crypto';

export class AgentManagementService implements IAgentManagementService {
  // In-memory token storage (Phase 3: basic implementation)
  // Phase 4: Move to database with AgentToken model
  private tokenStore = new Map<string, { agentId: string; linkedInAccountId: string; expiresAt: Date }>();

  constructor(private services: IDomainServices) {}

  async createAgent(data: {
    linkedInAccountId: string;
    state: string;
  }): Promise<Agent> {
    // Validate LinkedInAccount exists
    const account = await this.services.linkedInAccount.getLinkedInAccountById(data.linkedInAccountId);
    if (!account) {
      throw new DomainError('ACCOUNT_NOT_FOUND', 'LinkedIn account not found', 'agent-management');
    }

    // Check if agent already exists for this account (1:1 relationship)
    const existingAgent = await this.getAgentByLinkedInAccountId(data.linkedInAccountId);
    if (existingAgent && !existingAgent.deletedAt) {
      throw new DomainError('AGENT_EXISTS', 'Agent already exists for this LinkedIn account', 'agent-management');
    }

    try {
      return await prisma.agent.create({
        data: {
          linkedInAccountId: data.linkedInAccountId,
          state: data.state,
        },
      });
    } catch (error: any) {
      throw new DomainError('CREATE_FAILED', `Failed to create agent: ${error.message}`, 'agent-management');
    }
  }

  async getAgentById(agentId: string): Promise<Agent | null> {
    return await prisma.agent.findUnique({
      where: { agentId },
    });
  }

  async getAgentByLinkedInAccountId(linkedInAccountId: string): Promise<Agent | null> {
    return await prisma.agent.findFirst({
      where: {
        linkedInAccountId,
        deletedAt: null,
      },
    });
  }

  async updateAgent(
    agentId: string,
    data: Partial<Pick<Agent, 'state' | 'lastHeartbeatAt' | 'terminatedAt' | 'deletedAt'>>
  ): Promise<Agent> {
    try {
      return await prisma.agent.update({
        where: { agentId },
        data,
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new DomainError('AGENT_NOT_FOUND', 'Agent not found', 'agent-management');
      }
      throw new DomainError('UPDATE_FAILED', `Failed to update agent: ${error.message}`, 'agent-management');
    }
  }

  async generateAgentToken(agentId: string, linkedInAccountId: string): Promise<string> {
    // Validate agent exists
    const agent = await this.getAgentById(agentId);
    if (!agent) {
      throw new DomainError('AGENT_NOT_FOUND', 'Agent not found', 'agent-management');
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

    // Store token (Phase 3: in-memory, Phase 4: move to database)
    this.tokenStore.set(token, { agentId, linkedInAccountId, expiresAt });

    return token;
  }

  async validateAgentToken(token: string): Promise<{ agentId: string; linkedInAccountId: string } | null> {
    const tokenData = this.tokenStore.get(token);
    if (!tokenData) {
      return null;
    }

    // Check expiry
    if (tokenData.expiresAt < new Date()) {
      this.tokenStore.delete(token);
      return null;
    }

    return {
      agentId: tokenData.agentId,
      linkedInAccountId: tokenData.linkedInAccountId,
    };
  }

  async revokeAgentToken(token: string): Promise<void> {
    this.tokenStore.delete(token);
  }
}

