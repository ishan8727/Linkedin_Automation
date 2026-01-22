/**
 * Browser Manager
 * Phase 5: Agent Implementation
 * 
 * Manages Playwright browser instance
 * Browser session lives on user's machine (no credential storage)
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { config } from '../config';

export class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  async initialize(): Promise<void> {
    this.browser = await chromium.launch({
      headless: config.browser.headless,
      // channel: 'chromium' - removed for compatibility (uses installed browser)
    });

    // Create persistent context (session lives on user's machine)
    this.context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    this.page = await this.context.newPage();
  }

  getPage(): Page {
    if (!this.page) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }
    return this.page;
  }

  async navigate(url: string): Promise<void> {
    const page = this.getPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: config.browser.timeout });
  }

  async takeScreenshot(): Promise<Buffer> {
    const page = this.getPage();
    return await page.screenshot({ fullPage: true });
  }

  async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
    }
    if (this.browser) {
      await this.browser.close();
    }
  }
}

