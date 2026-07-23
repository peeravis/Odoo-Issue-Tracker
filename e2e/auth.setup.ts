import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '.auth/user.json');

setup('authenticate as admin', async ({ page }) => {
  await page.goto('/login');
  await page.waitForSelector('#email', { state: 'visible' });

  await page.fill('#email', 'peeravis@scg.com');
  await page.fill('#password', 'Nongpee.2544');
  await page.click('button[type="submit"]');

  await page.waitForURL(/\/(dashboard|issues|projects)/, { timeout: 15000 });
  await page.context().storageState({ path: authFile });
});
