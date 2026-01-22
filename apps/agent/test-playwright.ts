/**
 * Quick Playwright Test
 * Run this to verify Playwright is working
 */

import { chromium } from 'playwright';

async function testPlaywright() {
  console.log('Testing Playwright installation...');
  
  try {
    const browser = await chromium.launch({ headless: false });
    console.log('✓ Browser launched successfully');
    
    const page = await browser.newPage();
    console.log('✓ Page created');
    
    await page.goto('https://example.com');
    console.log('✓ Navigation successful');
    
    const title = await page.title();
    console.log(`✓ Page title: ${title}`);
    
    await browser.close();
    console.log('✓ Browser closed');
    
    console.log('\n✅ Playwright is working correctly!');
    process.exit(0);
  } catch (error: any) {
    console.error('✗ Playwright test failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Install browsers: npm run playwright:install');
    console.error('2. Check system dependencies (Linux may need additional packages)');
    process.exit(1);
  }
}

testPlaywright();

