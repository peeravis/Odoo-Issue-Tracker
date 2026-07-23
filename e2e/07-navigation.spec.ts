import { test, expect } from '@playwright/test';

test.describe('Navigation & Auth Guard', () => {
  test('root "/" redirect ไปหน้าที่ถูกต้อง', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/(dashboard|projects|issues)/);
  });

  test('protected routes ไม่มี session → redirect login', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();
    const routes = ['/issues', '/projects', '/dashboard', '/users'];
    for (const route of routes) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
    }
    await ctx.close();
  });

  test('sidebar navigation ลิงก์ทำงาน', async ({ page }) => {
    await page.goto('/dashboard');
    const issuesLink = page.getByRole('link', { name: /issues/i }).first();
    await expect(issuesLink).toBeVisible();
    await issuesLink.click();
    await expect(page).toHaveURL(/\/issues/);
  });

  test('profile page เข้าได้', async ({ page }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL('/profile');
  });

  test('master-data page เข้าได้', async ({ page }) => {
    await page.goto('/master-data');
    await expect(page).toHaveURL('/master-data');
  });

  test('/clients redirect ไปที่ /master-data', async ({ page }) => {
    await page.goto('/clients');
    await expect(page).toHaveURL('/master-data');
  });

  test('config page เข้าได้ (admin)', async ({ page }) => {
    await page.goto('/config');
    await expect(page).toHaveURL('/config');
  });
});
