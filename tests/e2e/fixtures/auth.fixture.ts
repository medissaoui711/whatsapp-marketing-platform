import { Page, test as base } from '@playwright/test';

export type AuthFixtures = {
  loginAsOwner: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
};

export const test = base.extend<AuthFixtures>({
  loginAsOwner: async ({ page }, use) => {
    const loginFn = async () => {
      await page.goto('/login');
      await page.fill('input[name="tenantSlug"]', process.env.E2E_TEST_TENANT || 'demo-company');
      await page.fill('input[name="email"]', process.env.E2E_TEST_EMAIL || 'owner@demo.com');
      await page.fill('input[name="password"]', process.env.E2E_TEST_PASSWORD || 'SecurePassword123!');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard', { timeout: 10000 });
    };
    await use(loginFn);
  },

  getAccessToken: async ({ page }, use) => {
    const getTokenFn = async () => {
      return page.evaluate(() => localStorage.getItem('access_token'));
    };
    await use(getTokenFn);
  },
});

export { expect } from '@playwright/test';
