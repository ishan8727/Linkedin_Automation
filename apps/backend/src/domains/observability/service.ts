/**
 * Domain 6: Observability & Audit Service
 * 
 * Owns: AuditLog, Metric
 * Responsibilities: Audit logging, metrics collection
 * Append-only, read-only for decisions
 * 
 * Phase 3: Service interface implementation
 */

import { AuditLog, Metric } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { IObservabilityService } from '../types';
import { DomainError } from '../types';

export class ObservabilityService implements IObservabilityService {
  async logEvent(data: {
    domain: string;
    eventType: string;
    entityType: string;
    entityId: string;
    actorType: string;
    actorId: string;
    payload: any;
  }): Promise<AuditLog> {
    try {
      return await prisma.auditLog.create({
        data: {
          domain: data.domain,
          eventType: data.eventType,
          entityType: data.entityType,
          entityId: data.entityId,
          actorType: data.actorType,
          actorId: data.actorId,
          payload: data.payload,
        },
      });
    } catch (error: any) {
      throw new DomainError('CREATE_FAILED', `Failed to log event: ${error.message}`, 'observability');
    }
  }

  async getAuditLogs(filters?: {
    domain?: string;
    entityType?: string;
    entityId?: string;
    limit?: number;
  }): Promise<AuditLog[]> {
    return await prisma.auditLog.findMany({
      where: {
        domain: filters?.domain,
        entityType: filters?.entityType,
        entityId: filters?.entityId,
      },
      orderBy: { timestamp: 'desc' },
      take: filters?.limit || 100,
    });
  }

  async recordMetric(data: {
    metricName: string;
    metricValue: number;
    dimensions: any;
    aggregationWindow: string;
  }): Promise<Metric> {
    try {
      return await prisma.metric.create({
        data: {
          metricName: data.metricName,
          metricValue: data.metricValue,
          dimensions: data.dimensions,
          aggregationWindow: data.aggregationWindow,
        },
      });
    } catch (error: any) {
      throw new DomainError('CREATE_FAILED', `Failed to record metric: ${error.message}`, 'observability');
    }
  }

  async getMetrics(filters?: {
    metricName?: string;
    limit?: number;
  }): Promise<Metric[]> {
    return await prisma.metric.findMany({
      where: {
        metricName: filters?.metricName,
      },
      orderBy: { recordedAt: 'desc' },
      take: filters?.limit || 100,
    });
  }
}

