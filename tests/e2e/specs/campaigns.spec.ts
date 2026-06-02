import { test, expect } from '../fixtures';

test.describe('إدارة الحملات', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="tenantSlug"]', 'demo-company');
    await page.fill('input[name="email"]', 'owner@demo.com');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('#4 - إنشاء حملة جديدة وإطلاقها', async ({ page, db }) => {
    const countBefore = await db.campaign.count();

    await page.click('a[href="/campaigns"]');
    await page.waitForURL('**/campaigns');

    await page.click('button:has-text("حملة جديدة")');
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    await page.fill('input[name="name"]', `اختبار E2E ${Date.now()}`);
    await page.selectOption('select[name="templateId"]', { index: 0 });
    await page.selectOption('select[name="targetType"]', 'all');

    await page.click('button:has-text("إنشاء حملة")');
    await expect(page.locator('.grid .card')).first().toBeVisible();

    const countAfter = await db.campaign.count();
    expect(countAfter).toBe(countBefore + 1);

    await page.click('button:has-text("تشغيل")');
    await expect(page.locator('.badge:has-text("قيد التنفيذ")')).toBeVisible();
  });

  test('#5 - مراقبة إحصائيات الحملة', async ({ page, db }) => {
    const totalCampaigns = await db.campaign.count();

    await page.click('a[href="/campaigns"]');
    await page.waitForURL('**/campaigns');

    await expect(page.locator('.grid > div:has-text("الكل")')).toBeVisible();
    await expect(page.locator('.grid > div:has-text("قيد التنفيذ")')).toBeVisible();
    await expect(page.locator('.grid > div:has-text("مكتملة")')).toBeVisible();

    if (totalCampaigns > 0) {
      const campaignCards = page.locator('.grid .card');
      expect(await campaignCards.count()).toBeGreaterThan(0);
    }
  });
});
