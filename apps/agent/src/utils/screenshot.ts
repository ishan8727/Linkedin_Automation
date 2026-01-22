/**
 * Screenshot Utilities
 * Phase 5: Agent Implementation
 */

import { Buffer } from 'buffer';

export function bufferToBase64(buffer: Buffer): string {
  return buffer.toString('base64');
}

export function base64ToBuffer(base64: string): Buffer {
  return Buffer.from(base64, 'base64');
}

