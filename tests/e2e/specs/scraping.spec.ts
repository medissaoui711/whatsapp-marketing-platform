import { test, expect } from '../fixtures';

test.describe('مهام الكشط الآلي', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="tenantSlug"]', 'demo-company');
    await page.fill('input[name="email"]', 'owner@demo.com');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('#6 - بدء مهمة كشط جديدة ومراقبتها', async ({ page, db }) => {
    const countBefore = await db.scrapingJob.count();

    await page.click('a[href="/scraping"]');
    await page.waitForURL('**/scraping');

    await page.click('button:has-text("مهمة جديدة")');
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    await page.selectOption('select[name="type"]', 'twitter');
    await page.fill('input[name="targetUrl"]', 'https://twitter.com/username');
    await page.fill('input[name="maxPosts"]', '50');

    await page.click('button:has-text("بدء الكشط")');

    await expect(page.locator('text=قيد التنفيذ')).toBeVisible();
    await expect(page.locator('[data-testid="job-progress"]')).toBeVisible();

    const countAfter = await db.scrapingJob.count();
    expect(countAfter).toBe(countBefore + 1);
  });
});
