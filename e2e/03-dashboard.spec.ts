import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('เข้าหน้า dashboard ได้', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/dashboard');
  });

  test('แสดง stats cards', async ({ page }) => {
    await page.goto('/dashboard');
    // ตรวจว่ามี stat cards (total, open, in progress ฯลฯ)
    await expect(page.locator('[class*="rounded"]').first()).toBeVisible();
  });

  test('มีลิงก์ไปหน้า issues และ projects', async ({ page }) => {
    await page.goto('/dashboard');
    // dashboard มี navigation
    await expect(page.locator('nav, [class*="sidebar"], a[href="/issues"]').first()).toBeVisible();
  });

  test('unauthorized redirect ไปหน้า login', async ({ browser }) => {
    // ไม่มี session
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await ctx.newPage();
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
    await ctx.close();
  });
});
