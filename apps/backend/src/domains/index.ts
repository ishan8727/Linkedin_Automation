/**
 * Domain Services Registry
 * 
 * Wires up all domain services with their dependencies.
 * Provides singleton instances for use throughout the application.
 */

import { AuthIdentityService } from './auth-identity/service';
import { LinkedInAccountService } from './linkedin-account/service';
import { AgentManagementService } from './agent-management/service';
import { JobExecutionService } from './job-execution/service';
import { RiskSafetyService } from './risk-safety/service';
import { ObservabilityService } from './observability/service';
import { IDomainServices } from './types';

// Create service instances in dependency order
const authIdentity = new AuthIdentityService();
const observability = new ObservabilityService();

// Create partial service registry for initial construction
const partialServices: Partial<IDomainServices> = {
  authIdentity,
  observability,
};

// Create services that depend on others
const linkedInAccount = new LinkedInAccountService(partialServices as IDomainServices);
const agentManagement = new AgentManagementService(partialServices as IDomainServices);
const jobExecution = new JobExecutionService(partialServices as IDomainServices);
const riskSafety = new RiskSafetyService(partialServices as IDomainServices);

// Wire up complete service registry
const services: IDomainServices = {
  authIdentity,
  linkedInAccount,
  agentManagement,
  jobExecution,
  riskSafety,
  observability,
};

// Update services with full service registry (for cross-domain calls)
(linkedInAccount as any).services = services;
(agentManagement as any).services = services;
(jobExecution as any).services = services;
(riskSafety as any).services = services;

export default services;
export {
  authIdentity,
  linkedInAccount,
  agentManagement,
  jobExecution,
  riskSafety,
  observability,
};

