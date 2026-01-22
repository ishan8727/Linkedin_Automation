/**
 * Human-like Randomization
 * Phase 5: Agent Implementation
 * 
 * Apply human-like randomization to avoid detection
 */

/**
 * Random delay between min and max milliseconds
 */
export function randomDelay(min: number, max: number): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Random mouse movement (human-like)
 */
export function randomMouseMovement(): { x: number; y: number } {
  return {
    x: Math.floor(Math.random() * 10) - 5,
    y: Math.floor(Math.random() * 10) - 5,
  };
}

