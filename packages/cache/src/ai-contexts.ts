import { getCache, CACHE_TTL, CACHE_PREFIX } from './index';
import { prisma } from '@repo/db';

export interface AIContextCache {
  id: string;
  name: string;
  triggerKeywords?: string[];
  context: string;
  priority: number;
  isEnabled: boolean;
}

export async function getAIContextsCached(
  orgId: string,
  whatsAppAccount: string,
): Promise<AIContextCache[]> {
  const cache = getCache();
  const cacheKey = `${CACHE_PREFIX.AI_CONTEXTS}${orgId}:${whatsAppAccount}`;

  const cached = await cache.get<AIContextCache[]>(cacheKey);
  if (cached) return cached;

  const [accountContexts, globalContexts] = await Promise.all([
    prisma.aIContext.findMany({
      where: {
        organizationId: orgId,
        whatsAppAccount,
        isEnabled: true,
      },
      orderBy: { priority: 'desc' },
    }),
    prisma.aIContext.findMany({
      where: {
        organizationId: orgId,
        whatsAppAccount: '',
        isEnabled: true,
      },
      orderBy: { priority: 'desc' },
    }),
  ]);

  const contexts = [...accountContexts, ...globalContexts];
  const cacheData: AIContextCache[] = contexts.map((ctx) => ({
    id: ctx.id,
    name: ctx.name,
    triggerKeywords: ctx.triggerKeywords as string[] | undefined,
    context: ctx.context,
    priority: ctx.priority,
    isEnabled: ctx.isEnabled,
  }));

  await cache.set(cacheKey, cacheData, CACHE_TTL.AI_CONTEXTS);
  return cacheData;
}

export async function invalidateAIContextsCache(orgId: string): Promise<void> {
  const cache = getCache();
  const pattern = `${CACHE_PREFIX.AI_CONTEXTS}${orgId}:*`;
  await cache.deleteByPattern(pattern);
}


