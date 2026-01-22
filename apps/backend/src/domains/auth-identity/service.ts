/**
 * Domain 1: Auth & Identity Service
 * 
 * Owns: User
 * Responsibilities: User management
 * 
 * Phase 3: Service interface implementation
 */

import { User } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { IAuthIdentityService } from '../types';
import { DomainError } from '../types';

export class AuthIdentityService implements IAuthIdentityService {
  async createUser(data: { email: string }): Promise<User> {
    try {
      return await prisma.user.create({
        data: {
          email: data.email,
        },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new DomainError('DUPLICATE_EMAIL', 'User with this email already exists', 'auth-identity');
      }
      throw new DomainError('CREATE_FAILED', `Failed to create user: ${error.message}`, 'auth-identity');
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { userId },
    });
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { email },
    });
  }

  async updateUser(userId: string, data: Partial<Pick<User, 'email'>>): Promise<User> {
    try {
      return await prisma.user.update({
        where: { userId },
        data,
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new DomainError('USER_NOT_FOUND', 'User not found', 'auth-identity');
      }
      throw new DomainError('UPDATE_FAILED', `Failed to update user: ${error.message}`, 'auth-identity');
    }
  }
}

