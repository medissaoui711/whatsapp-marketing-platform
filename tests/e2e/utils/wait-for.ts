import { Page } from '@playwright/test';

export async function waitForTableLoad(page: Page, timeout = 10000): Promise<void> {
  await page.waitForSelector('table tbody tr, .grid .card, [data-testid="list-item"]', {
    timeout,
  });
}

export async function waitForToast(page: Page, timeout = 10000): Promise<void> {
  await page.waitForSelector('[role="alert"], .toast, [data-testid="toast"]', { timeout });
}

export async function waitForDialogClose(page: Page, timeout = 5000): Promise<void> {
  await page.waitForSelector('[role="dialog"]', { state: 'detached', timeout });
}

export async function waitForNavigation(page: Page, urlPattern: string | RegExp, timeout = 10000): Promise<void> {
  await page.waitForURL(urlPattern, { timeout });
}

export async function waitForDownload(page: Page, timeout = 30000): Promise<string> {
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout }),
  ]);
  return download.suggestedFilename();
}
