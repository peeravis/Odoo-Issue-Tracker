import { test, expect } from '@playwright/test';

// test นี้ไม่ใช้ storageState — ทดสอบ login page โดยตรง
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Login Page', () => {
  test('แสดงหน้า login ได้', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Issue Tracker' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'เข้าสู่ระบบ' })).toBeVisible();
  });

  test('login ด้วย credentials ผิดแสดง error', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('#email', { state: 'visible' });
    await page.fill('#email', 'notexist@example.com');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('.text-red-400')).toBeVisible({ timeout: 8000 });
  });
});
