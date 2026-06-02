import { getCache, CACHE_TTL, CACHE_PREFIX } from './index';
import { prisma } from '@repo/db';

export interface KeywordRuleCache {
  id: string;
  keywords: string[];
  matchType: 'exact' | 'contains' | 'starts_with' | 'regex';
  responseType: 'text' | 'template' | 'media' | 'flow' | 'script' | 'transfer';
  responseConfig: Record<string, any>;
  priority: number;
  isEnabled: boolean;
}

export async function getKeywordRulesCached(
  orgId: string,
  whatsAppAccount: string,
): Promise<KeywordRuleCache[]> {
  const cache = getCache();
  const cacheKey = `${CACHE_PREFIX.KEYWORD_RULES}${orgId}:${whatsAppAccount}`;

  const cached = await cache.get<KeywordRuleCache[]>(cacheKey);
  if (cached) return cached;

  const [accountRules, globalRules] = await Promise.all([
    prisma.keywordRule.findMany({
      where: {
        organizationId: orgId,
        whatsAppAccount,
        isEnabled: true,
      },
      orderBy: { priority: 'desc' },
    }),
    prisma.keywordRule.findMany({
      where: {
        organizationId: orgId,
        whatsAppAccount: '',
        isEnabled: true,
      },
      orderBy: { priority: 'desc' },
    }),
  ]);

  const rules = [...accountRules, ...globalRules];
  const cacheData: KeywordRuleCache[] = rules.map((rule) => ({
    id: rule.id,
    keywords: rule.keywords as string[],
    matchType: rule.matchType as any,
    responseType: rule.responseType as any,
    responseConfig: rule.responseConfig as Record<string, any>,
    priority: rule.priority,
    isEnabled: rule.isEnabled,
  }));

  await cache.set(cacheKey, cacheData, CACHE_TTL.KEYWORD_RULES);
  return cacheData;
}

export async function invalidateKeywordRulesCache(orgId: string): Promise<void> {
  const cache = getCache();
  const pattern = `${CACHE_PREFIX.KEYWORD_RULES}${orgId}:*`;
  await cache.deleteByPattern(pattern);
}


