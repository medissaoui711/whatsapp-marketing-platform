import { expect, Locator } from '@playwright/test';

export async function expectVisible(locator: Locator): Promise<void> {
  await expect(locator).toBeVisible();
}

export async function expectHidden(locator: Locator): Promise<void> {
  await expect(locator).toBeHidden();
}

export async function expectText(locator: Locator, text: string | RegExp): Promise<void> {
  await expect(locator).toContainText(text);
}

export async function expectCount(locator: Locator, count: number): Promise<void> {
  await expect(locator).toHaveCount(count);
}

export async function expectUrl(page: { url: () => string }, pattern: string | RegExp): Promise<void> {
  expect(page.url()).toMatch(pattern);
}

export async function expectInputValue(locator: Locator, value: string): Promise<void> {
  await expect(locator).toHaveValue(value);
}

export async function expectDisabled(locator: Locator): Promise<void> {
  await expect(locator).toBeDisabled();
}

export async function expectEnabled(locator: Locator): Promise<void> {
  await expect(locator).toBeEnabled();
}
