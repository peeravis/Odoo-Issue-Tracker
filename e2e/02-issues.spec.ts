import { test, expect } from '@playwright/test';

// ใช้ storageState จาก auth.setup.ts (login ครั้งเดียว)

test.describe('Issues Page', () => {
  test('เข้าหน้า issues ได้', async ({ page }) => {
    await page.goto('/issues');
    await expect(page).toHaveURL('/issues');
  });

  test('มีปุ่ม New Issue', async ({ page }) => {
    await page.goto('/issues');
    const newBtn = page.getByRole('link', { name: /new issue/i });
    await expect(newBtn).toBeVisible();
  });

  test('กดปุ่ม New Issue ไปหน้าสร้าง issue', async ({ page }) => {
    await page.goto('/issues');
    await page.getByRole('link', { name: /new issue/i }).click();
    await expect(page).toHaveURL('/issues/new');
  });
});

test.describe('New Issue Form', () => {
  test('แสดงฟอร์มสร้าง issue', async ({ page }) => {
    await page.goto('/issues/new');
    await expect(page.locator('form')).toBeVisible();
  });
});
