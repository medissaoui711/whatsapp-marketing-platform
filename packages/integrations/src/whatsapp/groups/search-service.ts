import { prisma } from '@repo/db';
import type { GroupSearchQuery, SearchResult, WhatsAppGroup } from './types';

class GoogleSearchProvider {
  async search(keyword: string, limit: number): Promise<Partial<WhatsAppGroup>[]> {
    const mockResults: Partial<WhatsAppGroup>[] = [
      {
        name: `مجموعة ${keyword} التعليمية`,
        description: `أفضل مجموعة لتعلم ${keyword} على واتساب`,
        inviteLink: `https://chat.whatsapp.com/${this.generateMockId()}`,
        source: 'google',
        category: 'education',
        memberCount: Math.floor(Math.random() * 500) + 50,
        verified: true,
      },
      {
        name: `مناقشات ${keyword}`,
        description: `مجموعة مفتوحة للنقاش حول ${keyword}`,
        inviteLink: `https://chat.whatsapp.com/${this.generateMockId()}`,
        source: 'google',
        category: 'discussion',
        memberCount: Math.floor(Math.random() * 300) + 20,
        verified: false,
      },
      {
        name: `${keyword} - أخبار ومستجدات`,
        description: `آخر أخبار ${keyword} ومستجدات المجال`,
        inviteLink: `https://chat.whatsapp.com/${this.generateMockId()}`,
        source: 'google',
        category: 'news',
        memberCount: Math.floor(Math.random() * 800) + 100,
        verified: true,
      },
    ];

    return mockResults.slice(0, limit);
  }

  private generateMockId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}

class TelegramSearchProvider {
  async search(keyword: string, limit: number): Promise<Partial<WhatsAppGroup>[]> {
    return [
      {
        name: `${keyword} Community`,
        description: `Join our ${keyword} WhatsApp group`,
        inviteLink: `https://chat.whatsapp.com/${this.generateMockId()}`,
        source: 'telegram',
        memberCount: Math.floor(Math.random() * 1000) + 100,
        verified: false,
      },
      {
        name: `مجتمع ${keyword} العربي`,
        description: `أكبر مجتمع عربي مهتم بـ ${keyword}`,
        inviteLink: `https://chat.whatsapp.com/${this.generateMockId()}`,
        source: 'telegram',
        category: 'community',
        memberCount: Math.floor(Math.random() * 2000) + 200,
        verified: false,
      },
    ].slice(0, limit);
  }

  private generateMockId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}

class GitHubSearchProvider {
  async search(keyword: string, limit: number): Promise<Partial<WhatsAppGroup>[]> {
    return [
      {
        name: `${keyword}-whatsapp-group`,
        description: `WhatsApp group link for ${keyword} developers`,
        inviteLink: `https://chat.whatsapp.com/${this.generateMockId()}`,
        source: 'github',
        verified: true,
      },
    ].slice(0, limit);
  }

  private generateMockId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}

export class GroupSearchService {
  private googleProvider: GoogleSearchProvider;
  private telegramProvider: TelegramSearchProvider;
  private githubProvider: GitHubSearchProvider;
  private searchCache: Map<string, { results: SearchResult; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000;

  constructor() {
    this.googleProvider = new GoogleSearchProvider();
    this.telegramProvider = new TelegramSearchProvider();
    this.githubProvider = new GitHubSearchProvider();
  }

  async searchGroups(query: GroupSearchQuery, tenantId: string): Promise<SearchResult> {
    const { keyword, source = 'all', limit = 20, page = 1 } = query;

    const cacheKey = `${tenantId}:${keyword}:${source}:${limit}:${page}`;
    const cached = this.searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.results;
    }

    const searchId = `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    let allResults: Partial<WhatsAppGroup>[] = [];

    if (source === 'all' || source === 'google') {
      const googleResults = await this.googleProvider.search(keyword, limit);
      allResults.push(...googleResults);
    }

    if (source === 'all' || source === 'telegram') {
      const telegramResults = await this.telegramProvider.search(keyword, limit);
      allResults.push(...telegramResults);
    }

    if (source === 'all' || source === 'github') {
      const githubResults = await this.githubProvider.search(keyword, limit);
      allResults.push(...githubResults);
    }

    const uniqueResults = Array.from(
      new Map(allResults.map(r => [r.inviteLink, r])).values()
    );

    const sorted = uniqueResults.sort(
      (a, b) => (b.memberCount || 0) - (a.memberCount || 0)
    );

    const start = (page - 1) * limit;
    const paginated = sorted.slice(start, start + limit);

    const results: SearchResult = {
      groups: paginated.map(g => ({
        id: `${g.source}_${Date.now()}_${Math.random()}`,
        name: g.name || '',
        description: g.description || '',
        inviteLink: g.inviteLink || '',
        source: g.source || 'google',
        category: g.category,
        memberCount: g.memberCount,
        verified: g.verified || false,
        isActive: true,
        addedAt: new Date(),
      })),
      total: sorted.length,
      page,
      limit,
      hasMore: start + limit < sorted.length,
      searchId,
    };

    this.searchCache.set(cacheKey, { results, timestamp: Date.now() });

    await prisma.auditLog.create({
      data: {
        tenantId,
        action: 'GROUP_SEARCH',
        severity: 'LOW',
        details: {
          keyword,
          source,
          resultsCount: results.groups.length,
          searchId,
        },
      },
    });

    return results;
  }

  async validateInviteLink(
    inviteLink: string
  ): Promise<{ isValid: boolean; groupInfo?: any }> {
    const whatsappPattern = /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]{22}$/;
    if (!whatsappPattern.test(inviteLink)) {
      return { isValid: false };
    }

    return { isValid: true };
  }

  cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of this.searchCache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.searchCache.delete(key);
      }
    }
  }
}

export const groupSearchService = new GroupSearchService();

setInterval(() => groupSearchService.cleanupCache(), 10 * 60 * 1000);
