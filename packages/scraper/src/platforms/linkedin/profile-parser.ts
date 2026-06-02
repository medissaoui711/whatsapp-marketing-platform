import type { Page } from 'puppeteer';
import type { LinkedInProfile, Experience } from './types';

export class LinkedInProfileParser {
  async parseProfile(page: Page, username: string): Promise<LinkedInProfile> {
    await page.waitForSelector('.pv-top-card', { timeout: 15000 });

    let profileData: Record<string, unknown> | null = null;

    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('voyager/api/identity/profiles')) {
        try {
          const data = await response.json() as Record<string, unknown>;
          profileData = data;
        } catch {
          // ignore parse errors from non-JSON responses
        }
      }
    });

    const domData = await page.evaluate(() => {
      const getText = (selector: string, context?: ParentNode): string => {
        const root = context || document;
        const el = root.querySelector(selector);
        return el?.textContent?.trim() || '';
      };

      const getExperience = (): Experience[] => {
        const experiences: Experience[] = [];
        const items = document.querySelectorAll('.experience-section .pv-entity__summary-info');
        items.forEach((item) => {
          experiences.push({
            title: getText('.pv-entity__summary-title', item),
            company: getText('.pv-entity__company-summary-info', item),
            startDate: getText('.pv-entity__date-range span:first-child', item),
            endDate: getText('.pv-entity__date-range span:last-child', item),
            current: getText('.pv-entity__date-range span:last-child', item).includes('Present'),
            description: getText('.pv-entity__description', item),
          });
        });
        return experiences;
      };

      const getSkills = (): string[] => {
        const skills: string[] = [];
        const items = document.querySelectorAll('.pv-skill-category-entity__skill-text');
        items.forEach((item) => {
          const text = item.textContent?.trim();
          if (text) skills.push(text);
        });
        return skills;
      };

      const img = document.querySelector('.pv-top-card img');
      return {
        fullName: getText('.pv-top-card h1'),
        headline: getText('.pv-top-card .pv-text-details__line-two'),
        location: getText('.pv-top-card .pv-text-details__line-three'),
        about: getText('.pv-about-section .pv-shared-text-with-see-more'),
        profileImage: img?.getAttribute('src') || '',
      };
    });

    return {
      id: username,
      username,
      ...domData,
      experience: [],
      education: [],
      skills: [],
      languages: [],
      certifications: [],
      recommendations: [],
      followers: 0,
      connections: 0,
      profileUrl: `https://linkedin.com/in/${username}`,
      isPublic: true,
    };
  }

  async parseSearchResults(page: Page, _keyword: string): Promise<Record<string, string>[]> {
    await page.waitForSelector('.search-results-container', { timeout: 10000 });

    const results = await page.evaluate(() => {
      const profiles: Record<string, string>[] = [];
      const items = document.querySelectorAll('.search-result__info');
      items.forEach((item) => {
        profiles.push({
          name: item.querySelector('.actor-name')?.textContent?.trim() || '',
          headline: item.querySelector('.subline-level-1')?.textContent?.trim() || '',
          location: item.querySelector('.subline-level-2')?.textContent?.trim() || '',
          profileUrl: item.querySelector('a')?.getAttribute('href') || '',
        });
      });
      return profiles;
    });

    return results;
  }
}
