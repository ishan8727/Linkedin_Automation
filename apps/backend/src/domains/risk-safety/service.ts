/**
 * Domain 5: Risk & Safety Service
 * 
 * Owns: RateLimitRule, Violation, RiskScore
 * Responsibilities: Rate limiting, risk calculation, violation tracking, veto power
 * 
 * Phase 3: Service interface implementation
 */

import { RateLimitRule, Violation, RiskScore } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { IRiskSafetyService, IDomainServices } from '../types';
import { DomainError } from '../types';

export class RiskSafetyService implements IRiskSafetyService {
  constructor(private services: IDomainServices) {}

  async createRateLimitRule(data: {
    actionType: string;
    maxCount: number;
    windowDuration: number;
    isActive: boolean;
  }): Promise<RateLimitRule> {
    try {
      return await prisma.rateLimitRule.create({
        data: {
          actionType: data.actionType,
          maxCount: data.maxCount,
          windowDuration: data.windowDuration,
          isActive: data.isActive,
        },
      });
    } catch (error: any) {
      throw new DomainError('CREATE_FAILED', `Failed to create rate limit rule: ${error.message}`, 'risk-safety');
    }
  }

  async getActiveRateLimitRules(actionType?: string): Promise<RateLimitRule[]> {
    return await prisma.rateLimitRule.findMany({
      where: {
        isActive: true,
        actionType: actionType,
        deletedAt: null,
      },
    });
  }

  async createViolation(data: {
    linkedInAccountId: string;
    ruleId: string;
    jobId?: string;
    violationType: string;
    severity: string;
  }): Promise<Violation> {
    // Validate LinkedInAccount exists
    const account = await this.services.linkedInAccount.getLinkedInAccountById(data.linkedInAccountId);
    if (!account) {
      throw new DomainError('ACCOUNT_NOT_FOUND', 'LinkedIn account not found', 'risk-safety');
    }

    // Validate rule exists
    const rule = await prisma.rateLimitRule.findUnique({
      where: { ruleId: data.ruleId },
    });
    if (!rule) {
      throw new DomainError('RULE_NOT_FOUND', 'Rate limit rule not found', 'risk-safety');
    }

    // Validate job exists if provided
    if (data.jobId) {
      const job = await this.services.jobExecution.getJobById(data.jobId);
      if (!job) {
        throw new DomainError('JOB_NOT_FOUND', 'Job not found', 'risk-safety');
      }
    }

    try {
      return await prisma.violation.create({
        data: {
          linkedInAccountId: data.linkedInAccountId,
          ruleId: data.ruleId,
          jobId: data.jobId,
          violationType: data.violationType,
          severity: data.severity,
        },
      });
    } catch (error: any) {
      throw new DomainError('CREATE_FAILED', `Failed to create violation: ${error.message}`, 'risk-safety');
    }
  }

  async getViolationsByLinkedInAccountId(linkedInAccountId: string): Promise<Violation[]> {
    return await prisma.violation.findMany({
      where: { linkedInAccountId },
      orderBy: { detectedAt: 'desc' },
    });
  }

  async calculateRiskScore(linkedInAccountId: string): Promise<RiskScore> {
    // Validate account exists
    const account = await this.services.linkedInAccount.getLinkedInAccountById(linkedInAccountId);
    if (!account) {
      throw new DomainError('ACCOUNT_NOT_FOUND', 'LinkedIn account not found', 'risk-safety');
    }

    // Get recent violations
    const violations = await this.getViolationsByLinkedInAccountId(linkedInAccountId);
    const recentViolations = violations.filter(
      v => !v.resolvedAt && new Date(v.detectedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    // Simple risk calculation (Phase 3: basic, Phase 4: enhance)
    let score = 0.0;
    const factors: any = {};

    // Violation-based scoring
    recentViolations.forEach(v => {
      const severityWeight = { LOW: 0.1, MEDIUM: 0.3, HIGH: 0.6, CRITICAL: 1.0 }[v.severity] || 0.1;
      score += severityWeight;
    });

    // Account health status
    if (account.healthStatus === 'SUSPENDED') {
      score += 0.5;
      factors.accountSuspended = true;
    } else if (account.healthStatus === 'DEGRADED') {
      score += 0.2;
      factors.accountDegraded = true;
    }

    // Normalize score to 0-1 range
    score = Math.min(score, 1.0);

    // Determine risk level
    let riskLevel = 'LOW';
    if (score >= 0.8) riskLevel = 'CRITICAL';
    else if (score >= 0.6) riskLevel = 'HIGH';
    else if (score >= 0.3) riskLevel = 'MEDIUM';

    factors.violationCount = recentViolations.length;
    factors.score = score;

    try {
      return await prisma.riskScore.create({
        data: {
          linkedInAccountId,
          score,
          riskLevel,
          factors,
        },
      });
    } catch (error: any) {
      throw new DomainError('CREATE_FAILED', `Failed to calculate risk score: ${error.message}`, 'risk-safety');
    }
  }

  async getLatestRiskScore(linkedInAccountId: string): Promise<RiskScore | null> {
    return await prisma.riskScore.findFirst({
      where: { linkedInAccountId },
      orderBy: { calculatedAt: 'desc' },
    });
  }

  async isExecutionAllowed(linkedInAccountId: string): Promise<{ allowed: boolean; reason: string | null }> {
    // Check account health
    const account = await this.services.linkedInAccount.getLinkedInAccountById(linkedInAccountId);
    if (!account) {
      return { allowed: false, reason: 'SESSION_INVALID' };
    }

    if (account.healthStatus === 'SUSPENDED') {
      return { allowed: false, reason: 'RISK_PAUSE' };
    }

    // Check latest risk score
    const riskScore = await this.getLatestRiskScore(linkedInAccountId);
    if (riskScore && riskScore.riskLevel === 'CRITICAL') {
      return { allowed: false, reason: 'RISK_PAUSE' };
    }

    // Check validation status
    if (account.validationStatus === 'EXPIRED' || account.validationStatus === 'DISCONNECTED') {
      return { allowed: false, reason: 'SESSION_INVALID' };
    }

    return { allowed: true, reason: null };
  }
}

