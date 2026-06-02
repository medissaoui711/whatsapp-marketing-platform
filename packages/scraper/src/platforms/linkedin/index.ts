import type { LinkedInJob } from './types';
import { LinkedInProfileParser } from './profile-parser';

export class LinkedInScraper {
  private parser: LinkedInProfileParser;

  constructor() {
    this.parser = new LinkedInProfileParser();
  }

  async scrapeProfile(job: LinkedInJob): Promise<Record<string, unknown>> {
    const { default: puppeteer } = await import('puppeteer');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();

      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      const url = `https://www.linkedin.com/in/${job.target}/`;
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      const needsLogin = await this.isLoginRequired(page);
      if (needsLogin) {
        throw new Error('LinkedIn login required – please add session cookies via admin UI');
      }

      const profile = await this.parser.parseProfile(page, job.target);
      return profile as unknown as Record<string, unknown>;
    } finally {
      await browser.close();
    }
  }

  private async isLoginRequired(page: Awaited<ReturnType<import('puppeteer').Browser['newPage']>>): Promise<boolean> {
    const content = await page.content();
    return (
      content.includes('sign in') ||
      content.includes('login') ||
      content.includes('Join now') ||
      page.url().includes('/login')
    );
  }
}
