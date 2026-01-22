/**
 * Domain 5: Risk & Safety
 * 
 * Owns: RateLimitRule, Violation, RiskScore
 * 
 * Responsibilities:
 * - Rate limit enforcement
 * - Risk score calculation
 * - Violation detection
 * - Has veto power only
 * - Cannot directly mutate other domains
 * 
 * Phase 3: Service interface implemented
 */

export { RiskSafetyService } from './service';

