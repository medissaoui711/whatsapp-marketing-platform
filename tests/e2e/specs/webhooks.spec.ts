import { test, expect } from '../fixtures';

test.describe('إدارة Webhooks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="tenantSlug"]', 'demo-company');
    await page.fill('input[name="email"]', 'owner@demo.com');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('#7 - إضافة Webhook جديد واختباره', async ({ page, db }) => {
    const countBefore = await db.webhook.count();

    await page.click('a[href="/webhooks"]');
    await page.waitForURL('**/webhooks');

    await page.click('button:has-text("إضافة Webhook")');
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    await page.fill('input[name="name"]', 'اختبار Webhook E2E');
    await page.fill('input[name="url"]', 'https://example.com/webhook');
    await page.check('input[value="campaign.started"]');
    await page.check('input[value="message.delivered"]');

    await page.click('button:has-text("حفظ")');

    await expect(page.locator('text=اختبار Webhook E2E')).toBeVisible();

    const countAfter = await db.webhook.count();
    expect(countAfter).toBe(countBefore + 1);

    await page.click('button:has-text("إرسال اختبار")');
    await expect(page.locator('[role="alert"]')).toContainText('تم الإرسال');
  });
});
