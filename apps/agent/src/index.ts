/**
 * Agent Entry Point
 * Phase 5: Agent Implementation
 */

import { Agent } from './agent';

async function main() {
  const agent = new Agent();

  try {
    await agent.initialize();
    await agent.start();

    // Keep process alive
    process.on('SIGINT', async () => {
      await agent.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await agent.stop();
      process.exit(0);
    });
  } catch (error: any) {
    console.error('Fatal error:', error);
    await agent.stop();
    process.exit(1);
  }
}

main();

