/**
 * Domain 2: LinkedInAccount Management Service
 * 
 * Owns: LinkedInAccount
 * Responsibilities: LinkedInAccount CRUD, session validity tracking
 * 
 * Phase 3: Service interface implementation
 */

import { LinkedInAccount } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ILinkedInAccountService, IDomainServices } from '../types';
import { DomainError } from '../types';

export class LinkedInAccountService implements ILinkedInAccountService {
  constructor(private services: IDomainServices) {}

  async createLinkedInAccount(data: {
    userId: string;
    profileUrl: string;
    displayName: string;
    validationStatus: string;
    healthStatus: string;
    sessionValidAt?: Date;
    metadata?: any;
  }): Promise<LinkedInAccount> {
    // Validate user exists (read from auth-identity domain)
    const user = await this.services.authIdentity.getUserById(data.userId);
    if (!user) {
      throw new DomainError('USER_NOT_FOUND', 'User not found', 'linkedin-account');
    }

    try {
      return await prisma.linkedInAccount.create({
        data: {
          userId: data.userId,
          profileUrl: data.profileUrl,
          displayName: data.displayName,
          validationStatus: data.validationStatus,
          healthStatus: data.healthStatus,
          sessionValidAt: data.sessionValidAt,
          metadata: data.metadata || {},
        },
      });
    } catch (error: any) {
      throw new DomainError('CREATE_FAILED', `Failed to create LinkedIn account: ${error.message}`, 'linkedin-account');
    }
  }

  async getLinkedInAccountById(linkedInAccountId: string): Promise<LinkedInAccount | null> {
    return await prisma.linkedInAccount.findUnique({
      where: { linkedInAccountId },
    });
  }

  async getLinkedInAccountByUserId(userId: string): Promise<LinkedInAccount | null> {
    return await prisma.linkedInAccount.findFirst({
      where: { userId },
    });
  }

  async updateLinkedInAccount(
    linkedInAccountId: string,
    data: Partial<Pick<LinkedInAccount, 'validationStatus' | 'healthStatus' | 'sessionValidAt' | 'metadata'>>
  ): Promise<LinkedInAccount> {
    try {
      return await prisma.linkedInAccount.update({
        where: { linkedInAccountId },
        data: data as any, // Prisma type narrowing issue
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new DomainError('ACCOUNT_NOT_FOUND', 'LinkedIn account not found', 'linkedin-account');
      }
      throw new DomainError('UPDATE_FAILED', `Failed to update LinkedIn account: ${error.message}`, 'linkedin-account');
    }
  }
}

