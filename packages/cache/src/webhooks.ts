import { getCache, CACHE_TTL, CACHE_PREFIX } from './index';
import { prisma } from '@repo/db';

export interface WebhookCache {
  id: string;
  organizationId: string;
  name: string;
  url: string;
  events: string[];
  headers: Record<string, string>;
  secret?: string;
  isActive: boolean;
}

export async function getWebhooksCached(orgId: string): Promise<WebhookCache[]> {
  const cache = getCache();
  const cacheKey = `${CACHE_PREFIX.WEBHOOKS}${orgId}`;

  const cached = await cache.get<WebhookCache[]>(cacheKey);
  if (cached) return cached;

  const webhooks = await prisma.webhook.findMany({
    where: {
      organizationId: orgId,
      isActive: true,
    },
  });

  const cacheData: WebhookCache[] = webhooks.map((w) => ({
    id: w.id,
    organizationId: w.organizationId,
    name: w.name,
    url: w.url,
    events: w.events as string[],
    headers: w.headers as Record<string, string>,
    secret: w.secret || undefined,
    isActive: w.isActive,
  }));

  await cache.set(cacheKey, cacheData, CACHE_TTL.WEBHOOKS);
  return cacheData;
}

export async function invalidateWebhooksCache(orgId: string): Promise<void> {
  const cache = getCache();
  const cacheKey = `${CACHE_PREFIX.WEBHOOKS}${orgId}`;
  await cache.del(cacheKey);
}


