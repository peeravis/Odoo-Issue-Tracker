import { test, expect } from '@playwright/test';

// Remote DB IDs
const ODOO_GROUP_ID = 'cmredz8vw0000m1xiyw587b4r';
const SAP_GROUP_ID = 'cmree99j60000j9xinjnoqwir';
const DEMO_PROJECT_ID = 'cmrn0lpw8000037xiuhk72ny7';

test.describe('Projects — Group View (หน้าแรก)', () => {
  test('แสดงหน้า projects ได้', async ({ page }) => {
    await page.goto('/projects');
    await expect(page).toHaveURL('/projects');
    await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
  });

  test('แสดง "2 กลุ่ม" subtitle', async ({ page }) => {
    await page.goto('/projects');
    await expect(page.getByText('2 กลุ่ม')).toBeVisible();
  });

  test('แสดง group card "Odoo"', async ({ page }) => {
    await page.goto('/projects');
    await expect(page.getByText('Odoo').first()).toBeVisible();
    await expect(page.getByText(/2 projects/)).toBeVisible();
  });

  test('แสดง group card "SAP"', async ({ page }) => {
    await page.goto('/projects');
    await expect(page.getByText('SAP').first()).toBeVisible();
  });

  test('แสดง Active/Closed tabs', async ({ page }) => {
    await page.goto('/projects');
    await expect(page.getByRole('link', { name: /Active/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Closed/ })).toBeVisible();
  });

  test('admin เห็นปุ่ม New Group', async ({ page }) => {
    await page.goto('/projects');
    await expect(page.getByRole('button', { name: /New Group/i })
      .or(page.getByRole('link', { name: /New Group/i }))).toBeVisible();
  });

  test('คลิก Odoo group นำไปหน้า project list ของ Odoo', async ({ page }) => {
    await page.goto('/projects');
    await page.getByRole('link', { name: /Odoo/ }).first().click();
    await expect(page).toHaveURL(`/projects?groupId=${ODOO_GROUP_ID}`);
  });
});

test.describe('Projects — Inside Odoo Group', () => {
  test('แสดง project cards ใน Odoo group', async ({ page }) => {
    await page.goto(`/projects?groupId=${ODOO_GROUP_ID}`);
    await expect(page.getByText('Demo Project')).toBeVisible();
    await expect(page.getByText('DEMO01')).toBeVisible();
  });

  test('แสดง "Odoo Upgrade Phase 1" project', async ({ page }) => {
    await page.goto(`/projects?groupId=${ODOO_GROUP_ID}`);
    await expect(page.getByText('Odoo Upgrade Phase 1')).toBeVisible();
    await expect(page.getByText('ODOO01')).toBeVisible();
  });

  test('project card แสดง status badge "active"', async ({ page }) => {
    await page.goto(`/projects?groupId=${ODOO_GROUP_ID}`);
    await expect(page.getByText('active').first()).toBeVisible();
  });

  test('project card แสดง issue count', async ({ page }) => {
    await page.goto(`/projects?groupId=${ODOO_GROUP_ID}`);
    await expect(page.locator('text=/\\d+ issues/').first()).toBeVisible();
  });

  test('ปุ่ม "View Issues" ของ Demo Project นำไปหน้า issues กรองตาม project', async ({ page }) => {
    await page.goto(`/projects?groupId=${ODOO_GROUP_ID}`);
    // ใช้ href โดยตรง — แม่นยำกว่าการหาจาก text
    const viewIssuesLink = page.locator(`a[href="/issues?projectId=${DEMO_PROJECT_ID}"]`);
    await expect(viewIssuesLink).toBeVisible();
    await viewIssuesLink.click();
    await expect(page).toHaveURL(`/issues?projectId=${DEMO_PROJECT_ID}`);
  });

  test('ปุ่ม Settings gear (admin) นำไปหน้า project settings', async ({ page }) => {
    await page.goto(`/projects?groupId=${ODOO_GROUP_ID}`);
    const settingsLink = page.locator(`a[href*="/projects/${DEMO_PROJECT_ID}/settings"]`);
    await expect(settingsLink).toBeVisible();
    await settingsLink.click();
    await expect(page).toHaveURL(`/projects/${DEMO_PROJECT_ID}/settings`);
  });

  test('ปุ่ม Back (ArrowLeft) กลับไปหน้า groups', async ({ page }) => {
    await page.goto(`/projects?groupId=${ODOO_GROUP_ID}`);
    // back button เป็น link ที่ href="/projects" มี ArrowLeft icon
    // ใช้ locator ที่แคบกว่า — ไม่ใช่ sidebar
    await page.locator('main a[href="/projects"], header a[href="/projects"], [class*="flex"] > a[href="/projects"]')
      .first().click();
    await expect(page).toHaveURL('/projects');
  });
});

test.describe('Project Settings Page', () => {
  test('เข้าหน้า project settings ได้', async ({ page }) => {
    await page.goto(`/projects/${DEMO_PROJECT_ID}/settings`);
    await expect(page).toHaveURL(`/projects/${DEMO_PROJECT_ID}/settings`);
  });

  test('หน้า settings แสดงชื่อ project', async ({ page }) => {
    await page.goto(`/projects/${DEMO_PROJECT_ID}/settings`);
    await expect(page.getByText('Demo Project').first()).toBeVisible();
  });
});
