/**
 * Agent Configuration
 * Phase 5: Agent Implementation
 */

import dotenv from 'dotenv';

dotenv.config();

export const config = {
  backendUrl: process.env.BACKEND_URL || 'http://localhost:3000',
  userId: process.env.USER_ID || '',
  linkedinAccountId: process.env.LINKEDIN_ACCOUNT_ID || '',
  agentVersion: process.env.AGENT_VERSION || '1.0.0',
  browser: {
    headless: process.env.HEADLESS === 'true',
    timeout: parseInt(process.env.BROWSER_TIMEOUT_MS || '30000', 10),
  },
  heartbeat: {
    intervalSeconds: 15, // Will be updated from registration response
  },
  jobPolling: {
    intervalSeconds: 5, // Poll for jobs every 5 seconds when idle
  },
};

// Validate required config
if (!config.userId || !config.linkedinAccountId) {
  console.error('ERROR: USER_ID and LINKEDIN_ACCOUNT_ID must be set in .env');
  process.exit(1);
}

