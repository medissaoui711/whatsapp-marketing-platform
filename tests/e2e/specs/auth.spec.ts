import { test, expect } from '../fixtures';

test.describe('المصادقة', () => {
  test('#1 - تسجيل دخول ناجح مع توجيه للوحة التحكم', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('form')).toBeVisible();

    await page.fill('input[name="tenantSlug"]', 'demo-company');
    await page.fill('input[name="email"]', 'owner@demo.com');
    await page.fill('input[name="password"]', 'SecurePassword123!');

    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard', { timeout: 10000 });

    await expect(page.locator('h1')).toContainText('لوحة التحكم');

    const accessToken = await page.evaluate(() => localStorage.getItem('access_token'));
    expect(accessToken).toBeTruthy();
  });

  test('#2 - فشل تسجيل الدخول بسبب بيانات خاطئة', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="tenantSlug"]', 'demo-company');
    await page.fill('input[name="email"]', 'wrong@demo.com');
    await page.fill('input[name="password"]', 'wrong');

    await page.click('button[type="submit"]');

    const errorMessage = page.locator('[role="alert"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('البريد الإلكتروني أو كلمة المرور');

    await expect(page).toHaveURL('/login');
  });

  test('#10 - تجديد التوكن المنتهي', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="tenantSlug"]', 'demo-company');
    await page.fill('input[name="email"]', 'owner@demo.com');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    const token = await page.evaluate(() => localStorage.getItem('access_token'));
    expect(token).toBeTruthy();

    await page.evaluate(() => localStorage.setItem('access_token', 'expired_token'));

    await page.goto('/contacts');
    await page.waitForURL('**/login', { timeout: 5000 });

    const refreshToken = await page.evaluate(() => localStorage.getItem('refresh_token'));
    expect(refreshToken).toBeTruthy();
  });
});
