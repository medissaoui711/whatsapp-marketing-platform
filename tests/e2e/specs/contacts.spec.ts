import { test, expect } from '../fixtures';
import * as path from 'path';

test.describe('إدارة جهات الاتصال', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="tenantSlug"]', 'demo-company');
    await page.fill('input[name="email"]', 'owner@demo.com');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('#3 - استيراد جهات اتصال من CSV', async ({ page, db }) => {
    const countBefore = await db.contact.count();

    await page.goto('/contacts/import');

    const filePath = path.join(__dirname, '../data/sample-contacts.csv');
    await page.setInputFiles('input[type="file"]', filePath);

    await expect(page.locator('text=جاري رفع الملف')).toBeVisible();
    await expect(page.locator('text=اكتمل الاستيراد')).toBeVisible({ timeout: 60000 });
    await expect(page.locator('.text-green-600')).toContainText('تم استيراد');

    await page.click('button:has-text("عرض جهات الاتصال")');
    await page.waitForURL('**/contacts');

    const countAfter = await db.contact.count();
    expect(countAfter).toBeGreaterThan(countBefore);
  });

  test('#8 - تصدير جهات الاتصال إلى CSV', async ({ page }) => {
    await page.goto('/contacts');

    await page.click('button:has-text("تصدير")');
    await page.selectOption('select[name="format"]', 'csv');
    await page.click('button:has-text("بدء التصدير")');

    await expect(page.locator('text=اكتمل التصدير')).toBeVisible({ timeout: 30000 });

    const downloadLink = page.locator('a:has-text("تحميل الملف")');
    await expect(downloadLink).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      downloadLink.click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/\.csv$/);
  });

  test('#9 - إضافة جهة اتصال جديدة يدوياً', async ({ page, db }) => {
    const countBefore = await db.contact.count();

    await page.goto('/contacts');

    await page.click('button:has-text("جهة اتصال جديدة")');
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    await page.fill('input[name="firstName"]', 'فاطمة');
    await page.fill('input[name="lastName"]', 'أحمد');
    await page.fill('input[name="phone"]', '+966504567890');
    await page.fill('input[name="email"]', 'fatima@example.com');

    await page.click('button:has-text("حفظ")');
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();

    const countAfter = await db.contact.count();
    expect(countAfter).toBe(countBefore + 1);
  });
});
