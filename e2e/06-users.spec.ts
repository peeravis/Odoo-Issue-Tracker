import { test, expect } from '@playwright/test';

const EXISTING_USER_ID = 'cmr1rcsvo0000dw10fjhads33'; // Admin user

test.describe('Users Page (Admin)', () => {
  test('เข้าหน้า users ได้', async ({ page }) => {
    await page.goto('/users');
    await expect(page).toHaveURL('/users');
  });

  test('แสดงรายชื่อ users', async ({ page }) => {
    await page.goto('/users');
    await expect(page.getByText('Admin').first()).toBeVisible();
  });

  test('แสดง PEERAVIS user', async ({ page }) => {
    await page.goto('/users');
    await expect(page.getByText('PEERAVIS')).toBeVisible();
  });

  test('มีปุ่มสร้าง user ใหม่ (admin เห็น)', async ({ page }) => {
    await page.goto('/users');
    // admin เห็นปุ่ม invite/create user
    const createBtn = page.getByRole('button', { name: /invite|create|add|new user/i })
      .or(page.getByRole('link', { name: /invite|create|add|new user/i }));
    await expect(createBtn.first()).toBeVisible();
  });
});

test.describe('User Detail Page', () => {
  test('เข้าหน้า user detail ได้', async ({ page }) => {
    await page.goto(`/users/${EXISTING_USER_ID}`);
    await expect(page).toHaveURL(`/users/${EXISTING_USER_ID}`);
  });

  test('แสดงข้อมูล user', async ({ page }) => {
    await page.goto(`/users/${EXISTING_USER_ID}`);
    // แสดงอีเมลหรือชื่อของ admin user
    await expect(page.getByText(/admin@example\.com|Admin/i).first()).toBeVisible();
  });
});
