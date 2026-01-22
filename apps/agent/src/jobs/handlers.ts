/**
 * Job Handlers
 * Phase 5: Agent Implementation
 * 
 * Agent executes exactly one job at a time
 * Agent MUST NEVER: retry, reorder, decide
 */

import { Page } from 'playwright';
import { Job, JobResultRequest } from '../types/api';
import { BackendClient } from '../api/client';
import { BrowserManager } from '../browser/manager';
import { randomDelay } from '../utils/randomization';

export interface JobHandlerContext {
  page: Page;
  browser: BrowserManager;
  api: BackendClient;
  job: Job;
}

export interface JobHandlerResult {
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  failureReason?: 'UI_CHANGED' | 'TIMEOUT' | 'SESSION_EXPIRED' | 'UNKNOWN' | null;
  metadata: {
    observedState: 'CONNECTED' | 'PENDING' | 'NONE' | null;
  };
}

/**
 * Wait for element with timeout
 */
async function waitForElement(
  page: Page,
  selector: string,
  timeout: number = 10000
): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * VISIT_PROFILE handler
 */
export async function handleVisitProfile(context: JobHandlerContext): Promise<JobHandlerResult> {
  const { page, job } = context;
  
  try {
    const profileUrl = job.payload.profileUrl;
    if (!profileUrl) {
      return {
        status: 'FAILED',
        failureReason: 'UNKNOWN',
        metadata: { observedState: null },
      };
    }

    await page.goto(profileUrl, { waitUntil: 'networkidle' });
    await randomDelay(2000, 4000);

    // Check if profile loaded successfully
    const profileLoaded = await waitForElement(page, 'main[role="main"]', 10000);
    if (!profileLoaded) {
      return {
        status: 'FAILED',
        failureReason: 'UI_CHANGED',
        metadata: { observedState: null },
      };
    }

    return {
      status: 'SUCCESS',
      failureReason: null,
      metadata: { observedState: null },
    };
  } catch (error: any) {
    return {
      status: 'FAILED',
      failureReason: error.message?.includes('timeout') ? 'TIMEOUT' : 'UNKNOWN',
      metadata: { observedState: null },
    };
  }
}

/**
 * SEND_CONNECTION_REQUEST handler
 */
export async function handleSendConnectionRequest(context: JobHandlerContext): Promise<JobHandlerResult> {
  const { page, job } = context;
  
  try {
    const profileUrl = job.payload.profileUrl;
    if (!profileUrl) {
      return {
        status: 'FAILED',
        failureReason: 'UNKNOWN',
        metadata: { observedState: null },
      };
    }

    await page.goto(profileUrl, { waitUntil: 'networkidle' });
    await randomDelay(2000, 4000);

    // Look for "Connect" button
    const connectButton = await page.locator('button:has-text("Connect"), button:has-text("Connect")').first();
    
    if (!(await connectButton.isVisible({ timeout: 5000 }).catch(() => false))) {
      // Check if already connected
      const connectedIndicator = await page.locator('text=/Connected|Message/').first();
      if (await connectedIndicator.isVisible({ timeout: 2000 }).catch(() => false)) {
        return {
          status: 'SUCCESS',
          failureReason: null,
          metadata: { observedState: 'CONNECTED' },
        };
      }

      return {
        status: 'FAILED',
        failureReason: 'UI_CHANGED',
        metadata: { observedState: null },
      };
    }

    await connectButton.click();
    await randomDelay(1000, 2000);

    // If there's a modal, handle it
    const sendButton = await page.locator('button:has-text("Send"), button[aria-label*="Send"]').first();
    if (await sendButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Optional: Add note if provided
      if (job.payload.noteText) {
        const noteField = await page.locator('textarea, input[type="text"]').first();
        if (await noteField.isVisible({ timeout: 2000 }).catch(() => false)) {
          await noteField.fill(job.payload.noteText);
          await randomDelay(500, 1000);
        }
      }
      
      await sendButton.click();
      await randomDelay(1000, 2000);
    }

    // Check result
    const pendingIndicator = await page.locator('text=/Pending|Request sent/').first();
    const connectedIndicator = await page.locator('text=/Connected/').first();
    
    if (await pendingIndicator.isVisible({ timeout: 3000 }).catch(() => false)) {
      return {
        status: 'SUCCESS',
        failureReason: null,
        metadata: { observedState: 'PENDING' },
      };
    }

    if (await connectedIndicator.isVisible({ timeout: 2000 }).catch(() => false)) {
      return {
        status: 'SUCCESS',
        failureReason: null,
        metadata: { observedState: 'CONNECTED' },
      };
    }

    return {
      status: 'SUCCESS',
      failureReason: null,
      metadata: { observedState: 'PENDING' },
    };
  } catch (error: any) {
    return {
      status: 'FAILED',
      failureReason: error.message?.includes('timeout') ? 'TIMEOUT' : 'UI_CHANGED',
      metadata: { observedState: null },
    };
  }
}

/**
 * LIKE_POST handler
 */
export async function handleLikePost(context: JobHandlerContext): Promise<JobHandlerResult> {
  const { page, job } = context;
  
  try {
    const postUrl = job.payload.postUrl;
    if (!postUrl) {
      return {
        status: 'FAILED',
        failureReason: 'UNKNOWN',
        metadata: { observedState: null },
      };
    }

    await page.goto(postUrl, { waitUntil: 'networkidle' });
    await randomDelay(2000, 4000);

    // Find like button (LinkedIn uses various selectors)
    const likeButton = await page.locator('button[aria-label*="Like"], button[aria-label*="like"], button:has-text("Like")').first();
    
    if (!(await likeButton.isVisible({ timeout: 5000 }).catch(() => false))) {
      // Check if already liked
      const likedIndicator = await page.locator('button[aria-pressed="true"], button[aria-label*="Unlike"]').first();
      if (await likedIndicator.isVisible({ timeout: 2000 }).catch(() => false)) {
        return {
          status: 'SUCCESS',
          failureReason: null,
          metadata: { observedState: null },
        };
      }

      return {
        status: 'FAILED',
        failureReason: 'UI_CHANGED',
        metadata: { observedState: null },
      };
    }

    await likeButton.click();
    await randomDelay(1000, 2000);

    return {
      status: 'SUCCESS',
      failureReason: null,
      metadata: { observedState: null },
    };
  } catch (error: any) {
    return {
      status: 'FAILED',
      failureReason: error.message?.includes('timeout') ? 'TIMEOUT' : 'UI_CHANGED',
      metadata: { observedState: null },
    };
  }
}

/**
 * COMMENT_POST handler
 */
export async function handleCommentPost(context: JobHandlerContext): Promise<JobHandlerResult> {
  const { page, job } = context;
  
  try {
    const postUrl = job.payload.postUrl;
    const messageText = job.payload.messageText;
    
    if (!postUrl || !messageText) {
      return {
        status: 'FAILED',
        failureReason: 'UNKNOWN',
        metadata: { observedState: null },
      };
    }

    await page.goto(postUrl, { waitUntil: 'networkidle' });
    await randomDelay(2000, 4000);

    // Find comment input
    const commentInput = await page.locator('div[contenteditable="true"], textarea[placeholder*="comment"], textarea[placeholder*="Comment"]').first();
    
    if (!(await commentInput.isVisible({ timeout: 5000 }).catch(() => false))) {
      return {
        status: 'FAILED',
        failureReason: 'UI_CHANGED',
        metadata: { observedState: null },
      };
    }

    await commentInput.click();
    await randomDelay(500, 1000);
    await commentInput.fill(messageText);
    await randomDelay(1000, 2000);

    // Find post/comment button
    const postButton = await page.locator('button:has-text("Post"), button[aria-label*="Post comment"]').first();
    
    if (!(await postButton.isVisible({ timeout: 3000 }).catch(() => false))) {
      return {
        status: 'FAILED',
        failureReason: 'UI_CHANGED',
        metadata: { observedState: null },
      };
    }

    await postButton.click();
    await randomDelay(2000, 3000);

    return {
      status: 'SUCCESS',
      failureReason: null,
      metadata: { observedState: null },
    };
  } catch (error: any) {
    return {
      status: 'FAILED',
      failureReason: error.message?.includes('timeout') ? 'TIMEOUT' : 'UI_CHANGED',
      metadata: { observedState: null },
    };
  }
}

/**
 * SEND_MESSAGE handler
 */
export async function handleSendMessage(context: JobHandlerContext): Promise<JobHandlerResult> {
  const { page, job } = context;
  
  try {
    const profileUrl = job.payload.profileUrl;
    const messageText = job.payload.messageText;
    
    if (!profileUrl || !messageText) {
      return {
        status: 'FAILED',
        failureReason: 'UNKNOWN',
        metadata: { observedState: null },
      };
    }

    await page.goto(profileUrl, { waitUntil: 'networkidle' });
    await randomDelay(2000, 4000);

    // Find Message button
    const messageButton = await page.locator('button:has-text("Message"), button[aria-label*="Message"]').first();
    
    if (!(await messageButton.isVisible({ timeout: 5000 }).catch(() => false))) {
      return {
        status: 'FAILED',
        failureReason: 'UI_CHANGED',
        metadata: { observedState: null },
      };
    }

    await messageButton.click();
    await randomDelay(2000, 3000);

    // Find message input in modal
    const messageInput = await page.locator('div[contenteditable="true"], textarea[placeholder*="message"], textarea[placeholder*="Message"]').first();
    
    if (!(await messageInput.isVisible({ timeout: 5000 }).catch(() => false))) {
      return {
        status: 'FAILED',
        failureReason: 'UI_CHANGED',
        metadata: { observedState: null },
      };
    }

    await messageInput.click();
    await randomDelay(500, 1000);
    await messageInput.fill(messageText);
    await randomDelay(1000, 2000);

    // Find send button
    const sendButton = await page.locator('button[aria-label*="Send"], button:has-text("Send")').first();
    
    if (!(await sendButton.isVisible({ timeout: 3000 }).catch(() => false))) {
      return {
        status: 'FAILED',
        failureReason: 'UI_CHANGED',
        metadata: { observedState: null },
      };
    }

    await sendButton.click();
    await randomDelay(2000, 3000);

    return {
      status: 'SUCCESS',
      failureReason: null,
      metadata: { observedState: null },
    };
  } catch (error: any) {
    return {
      status: 'FAILED',
      failureReason: error.message?.includes('timeout') ? 'TIMEOUT' : 'UI_CHANGED',
      metadata: { observedState: null },
    };
  }
}

/**
 * Route job to appropriate handler
 */
export async function executeJob(context: JobHandlerContext): Promise<JobHandlerResult> {
  const { job } = context;

  switch (job.type) {
    case 'VISIT_PROFILE':
      return handleVisitProfile(context);
    case 'SEND_CONNECTION_REQUEST':
      return handleSendConnectionRequest(context);
    case 'LIKE_POST':
      return handleLikePost(context);
    case 'COMMENT_POST':
      return handleCommentPost(context);
    case 'SEND_MESSAGE':
      return handleSendMessage(context);
    default:
      return {
        status: 'FAILED',
        failureReason: 'UNKNOWN',
        metadata: { observedState: null },
      };
  }
}

