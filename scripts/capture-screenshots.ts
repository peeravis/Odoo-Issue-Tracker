import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const SCREENSHOTS_DIR = path.join(__dirname, '../docs/screenshots');
const AUTH_STATE = path.join(__dirname, '../e2e/.auth/user.json');

const VIEWPORT = { width: 1440, height: 900 };

async function capture() {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  // --- Login page (unauthenticated) ---
  const publicCtx = await browser.newContext({ viewport: VIEWPORT });
  const publicPage = await publicCtx.newPage();
  await publicPage.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await publicPage.waitForSelector('#email', { timeout: 15000 });
  await publicPage.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-login.png'), fullPage: false });
  console.log('✓ 01-login.png');
  await publicCtx.close();

  // --- Authenticated pages ---
  // Fresh login to get a valid session
  const loginCtx = await browser.newContext({ viewport: VIEWPORT });
  const loginPage = await loginCtx.newPage();
  await loginPage.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await loginPage.fill('#email', 'peeravis@scg.com');
  await loginPage.fill('#password', 'Nongpee.2544');
  await loginPage.click('button[type="submit"]');
  await loginPage.waitForURL(/\/(dashboard|issues|projects)/, { timeout: 15000 });
  await loginCtx.storageState({ path: AUTH_STATE });
  await loginCtx.close();
  console.log('✓ Authenticated (fresh login)');

  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    storageState: AUTH_STATE,
  });
  const page = await ctx.newPage();

  // 02 Dashboard
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-dashboard.png'), fullPage: false });
  console.log('✓ 02-dashboard.png');

  // 03 Issues list
  await page.goto(`${BASE_URL}/issues`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-issues-list.png'), fullPage: false });
  console.log('✓ 03-issues-list.png');

  // 04 New Issue form
  await page.goto(`${BASE_URL}/issues/new`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-issue-new.png'), fullPage: false });
  console.log('✓ 04-issue-new.png');

  // 05 Issue detail — find first issue link via href pattern in the DOM
  await page.goto(`${BASE_URL}/issues`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const issueHref = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href]')) as HTMLAnchorElement[];
    const match = links.find(a => /^\/issues\/[^/]+$/.test(a.getAttribute('href') ?? ''));
    return match?.getAttribute('href') ?? null;
  });
  if (issueHref) {
    await page.goto(`${BASE_URL}${issueHref}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
  } else {
    console.warn('⚠ No issue links found — skipping issue detail screenshot');
  }
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05-issue-detail.png'), fullPage: false });
  console.log('✓ 05-issue-detail.png');

  // 06 Projects list
  await page.goto(`${BASE_URL}/projects`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06-projects.png'), fullPage: false });
  console.log('✓ 06-projects.png');

  // 07 Project settings — click first project's settings link
  try {
    const settingsLink = page.locator('a[href*="/settings"]').first();
    const href = await settingsLink.getAttribute('href');
    if (href) {
      await page.goto(`${BASE_URL}${href}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1200);
    }
  } catch {
    // skip if no project
  }
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07-project-settings.png'), fullPage: false });
  console.log('✓ 07-project-settings.png');

  // 08 Users
  await page.goto(`${BASE_URL}/users`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08-users.png'), fullPage: false });
  console.log('✓ 08-users.png');

  // 09 Master Data
  await page.goto(`${BASE_URL}/master-data`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09-master-data.png'), fullPage: false });
  console.log('✓ 09-master-data.png');

  // 10 Config
  await page.goto(`${BASE_URL}/config`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '10-config.png'), fullPage: false });
  console.log('✓ 10-config.png');

  await ctx.close();
  await browser.close();
  console.log(`\nDone! Screenshots saved to: ${SCREENSHOTS_DIR}`);
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});
