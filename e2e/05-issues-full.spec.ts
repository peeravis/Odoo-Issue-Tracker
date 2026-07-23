import { test, expect } from '@playwright/test';

// Remote DB IDs
const DEMO_PROJECT_ID = 'cmrn0lpw8000037xiuhk72ny7';
const ISSUE_ID = 'cmrq9pjpo0001iy102s6o1xkg';         // ออก Invoice ไม่ได้ (in_progress)
const ISSUE_RESOLVED_ID = 'cmrn0o6gb000237xif49eat8t'; // Login ไม่ได้ (resolved)

test.describe('Issues List', () => {
  test('แสดง issues list', async ({ page }) => {
    await page.goto('/issues');
    await expect(page).toHaveURL('/issues');
    await expect(page.getByRole('heading', { name: 'Issues' })).toBeVisible();
  });

  test('แสดง issues ใน list (มีอยู่ใน DB)', async ({ page }) => {
    await page.goto('/issues');
    // หา issue links ใน table body โดยตรง — ไม่เอา option element ใน select
    await expect(page.locator('tbody a').first()).toBeVisible();
  });

  test('filter issues ตาม Demo Project', async ({ page }) => {
    await page.goto(`/issues?projectId=${DEMO_PROJECT_ID}`);
    await expect(page).toHaveURL(`/issues?projectId=${DEMO_PROJECT_ID}`);
    // ตรวจว่ามี issues แสดง
    await expect(page.locator('table, [class*="issue"], tbody tr').first()).toBeVisible();
  });

  test('filter issues ตาม status=in_progress', async ({ page }) => {
    await page.goto('/issues?status=in_progress');
    await expect(page).toHaveURL('/issues?status=in_progress');
  });

  test('filter issues ตาม priority=high', async ({ page }) => {
    await page.goto('/issues?priority=high');
    await expect(page).toHaveURL('/issues?priority=high');
  });

  test('search issues ด้วย keyword', async ({ page }) => {
    await page.goto('/issues?search=Login');
    await expect(page).toHaveURL('/issues?search=Login');
    // ตรวจว่าหน้าโหลดและแสดงผล
    await expect(page.getByRole('heading', { name: 'Issues' })).toBeVisible();
  });

  test('มีปุ่ม Export และ New Issue', async ({ page }) => {
    await page.goto('/issues');
    await expect(page.getByRole('button', { name: /Export/i })
      .or(page.getByRole('link', { name: /Export/i }))).toBeVisible();
    await expect(page.getByRole('link', { name: /New Issue/i })).toBeVisible();
  });

  test('มี quick filter buttons (My Issues, Overdue ฯลฯ)', async ({ page }) => {
    await page.goto('/issues');
    await expect(page.getByRole('button', { name: /My Issues/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Overdue/i })).toBeVisible();
  });
});

test.describe('Issue Detail', () => {
  test('เข้าหน้า issue detail ได้', async ({ page }) => {
    await page.goto(`/issues/${ISSUE_ID}`);
    await expect(page).toHaveURL(`/issues/${ISSUE_ID}`);
  });

  test('แสดงชื่อ issue', async ({ page }) => {
    await page.goto(`/issues/${ISSUE_ID}`);
    // ใช้ getByRole heading เพื่อ match เฉพาะ h1 ไม่ใช่ description
    await expect(page.getByRole('heading', { name: 'ออก Invoice ไม่ได้' })).toBeVisible();
  });

  test('แสดง status badge', async ({ page }) => {
    await page.goto(`/issues/${ISSUE_ID}`);
    await expect(page.getByText(/in_progress|In Progress|กำลังดำเนินการ/i).first()).toBeVisible();
  });

  test('แสดง comment section', async ({ page }) => {
    await page.goto(`/issues/${ISSUE_ID}`);
    // มี comment area หรือ textarea สำหรับ add comment
    const commentArea = page.locator('textarea, [placeholder*="comment"], [placeholder*="Comment"]')
      .or(page.getByText(/Comment|comment|ความคิดเห็น/i));
    await expect(commentArea.first()).toBeVisible();
  });

  test('ปุ่ม Back (ArrowLeft) กลับหน้า issues', async ({ page }) => {
    await page.goto(`/issues/${ISSUE_ID}`);
    // back ใช้ ArrowLeft icon ไม่มี text — ใช้ href แทน
    const backLink = page.locator('a[href="/issues"], a[href*="issues"]').first();
    await expect(backLink).toBeVisible();
    await backLink.click();
    await expect(page).toHaveURL(/\/issues/);
  });

  test('แสดง project name ของ issue', async ({ page }) => {
    await page.goto(`/issues/${ISSUE_ID}`);
    await expect(page.getByText('Demo Project').first()).toBeVisible();
  });

  test('issue resolved แสดง status resolved', async ({ page }) => {
    await page.goto(`/issues/${ISSUE_RESOLVED_ID}`);
    await expect(page.getByText(/resolved|Resolved/i).first()).toBeVisible();
  });

  test('issue ที่ไม่มีอยู่แสดงหน้า not found หรือ redirect', async ({ page }) => {
    await page.goto('/issues/nonexistent-id-99999');
    // Next.js notFound() → แสดง not found page หรือ 404
    const url = page.url();
    const title = await page.title();
    const body = await page.locator('body').textContent();
    // ต้องไม่ใช่หน้า issue detail ปกติ
    const isNotFound = body?.includes('not found') || body?.includes('404') ||
      body?.includes('ไม่พบ') || title?.includes('404') || url.includes('not-found');
    expect(isNotFound).toBeTruthy();
  });
});

test.describe('New Issue Form', () => {
  test('แสดงฟอร์ม New Issue พร้อม fields', async ({ page }) => {
    await page.goto('/issues/new');
    await expect(page.getByRole('heading', { name: 'New Issue' })).toBeVisible();
    await expect(page.locator('input[name="title"]')).toBeVisible();
  });

  test('มีปุ่ม Cancel และ Create Issue', async ({ page }) => {
    await page.goto('/issues/new');
    await expect(page.getByRole('link', { name: 'Cancel' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Issue' })).toBeVisible();
  });

  test('ปุ่ม Cancel กลับหน้า issues', async ({ page }) => {
    await page.goto('/issues/new');
    await page.getByRole('link', { name: 'Cancel' }).click();
    await expect(page).toHaveURL('/issues');
  });

  test('submit ฟอร์มว่าง — ไม่ redirect (HTML5 validation)', async ({ page }) => {
    await page.goto('/issues/new');
    await page.getByRole('button', { name: 'Create Issue' }).click();
    await expect(page).toHaveURL('/issues/new');
  });

  test('ฟอร์มมี field Priority (high/medium/low)', async ({ page }) => {
    await page.goto('/issues/new');
    await expect(page.locator('select[name="priority"]')).toBeVisible();
  });

  test('ฟอร์มมี field Due Date (required)', async ({ page }) => {
    await page.goto('/issues/new');
    await expect(page.locator('input[name="dueDate"]')).toBeVisible();
  });
});
