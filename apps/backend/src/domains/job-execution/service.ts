/**
 * Domain 4: Job & Execution Control Service
 * 
 * Owns: Job, JobResult
 * Responsibilities: Job creation, ordering, state transitions, execution control
 * 
 * Phase 3: Service interface implementation
 */

import { Job, JobResult } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { IJobExecutionService, IDomainServices } from '../types';
import { DomainError } from '../types';

export class JobExecutionService implements IJobExecutionService {
  constructor(private services: IDomainServices) {}

  async createJob(data: {
    linkedInAccountId: string;
    createdByUserId: string;
    jobType: string;
    parameters: any;
    state: string;
    priority: number;
  }): Promise<Job> {
    // Validate LinkedInAccount exists
    const account = await this.services.linkedInAccount.getLinkedInAccountById(data.linkedInAccountId);
    if (!account) {
      throw new DomainError('ACCOUNT_NOT_FOUND', 'LinkedIn account not found', 'job-execution');
    }

    // Validate User exists
    const user = await this.services.authIdentity.getUserById(data.createdByUserId);
    if (!user) {
      throw new DomainError('USER_NOT_FOUND', 'User not found', 'job-execution');
    }

    try {
      return await prisma.job.create({
        data: {
          linkedInAccountId: data.linkedInAccountId,
          createdByUserId: data.createdByUserId,
          jobType: data.jobType,
          parameters: data.parameters,
          state: data.state,
          priority: data.priority,
        },
      });
    } catch (error: any) {
      throw new DomainError('CREATE_FAILED', `Failed to create job: ${error.message}`, 'job-execution');
    }
  }

  async getJobById(jobId: string): Promise<Job | null> {
    return await prisma.job.findUnique({
      where: { jobId },
    });
  }

  async getJobsByLinkedInAccountId(linkedInAccountId: string, filters?: {
    state?: string;
    limit?: number;
  }): Promise<Job[]> {
    return await prisma.job.findMany({
      where: {
        linkedInAccountId,
        state: filters?.state,
        deletedAt: null,
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
      take: filters?.limit || 100,
    });
  }

  async updateJob(
    jobId: string,
    data: Partial<Pick<Job, 'state' | 'assignedAgentId' | 'assignedAt' | 'startedAt' | 'completedAt' | 'failureReason' | 'deletedAt'>>
  ): Promise<Job> {
    // If assigning agent, validate agent exists
    if (data.assignedAgentId) {
      const agent = await this.services.agentManagement.getAgentById(data.assignedAgentId);
      if (!agent) {
        throw new DomainError('AGENT_NOT_FOUND', 'Agent not found', 'job-execution');
      }
    }

    try {
      return await prisma.job.update({
        where: { jobId },
        data,
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new DomainError('JOB_NOT_FOUND', 'Job not found', 'job-execution');
      }
      throw new DomainError('UPDATE_FAILED', `Failed to update job: ${error.message}`, 'job-execution');
    }
  }

  async createJobResult(data: {
    jobId: string;
    agentId: string;
    status: string;
    result: any;
    errorMessage?: string;
  }): Promise<JobResult> {
    // Validate job exists
    const job = await this.getJobById(data.jobId);
    if (!job) {
      throw new DomainError('JOB_NOT_FOUND', 'Job not found', 'job-execution');
    }

    // Validate agent exists
    const agent = await this.services.agentManagement.getAgentById(data.agentId);
    if (!agent) {
      throw new DomainError('AGENT_NOT_FOUND', 'Agent not found', 'job-execution');
    }

    try {
      return await prisma.jobResult.create({
        data: {
          jobId: data.jobId,
          agentId: data.agentId,
          status: data.status,
          result: data.result,
          errorMessage: data.errorMessage,
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new DomainError('RESULT_EXISTS', 'Job result already exists for this job', 'job-execution');
      }
      throw new DomainError('CREATE_FAILED', `Failed to create job result: ${error.message}`, 'job-execution');
    }
  }

  async getJobResultByJobId(jobId: string): Promise<JobResult | null> {
    return await prisma.jobResult.findUnique({
      where: { jobId },
    });
  }
}

