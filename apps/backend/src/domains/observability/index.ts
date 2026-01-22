/**
 * Domain 6: Observability & Audit
 * 
 * Owns: AuditLog, Metric
 * 
 * Responsibilities:
 * - Audit logging (append-only)
 * - Metrics collection
 * - Read-only
 * - Never affects decisions
 * 
 * Phase 3: Service interface implemented
 */

export { ObservabilityService } from './service';

