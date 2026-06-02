import { getCache, CACHE_TTL, CACHE_PREFIX } from './index';
import { prisma } from '@repo/db';

export interface TagCache {
  name: string;
  color?: string;
}

export async function getTagsCached(orgId: string): Promise<TagCache[]> {
  const cache = getCache();
  const cacheKey = `${CACHE_PREFIX.TAGS}${orgId}`;

  const cached = await cache.get<TagCache[]>(cacheKey);
  if (cached) return cached;

  const tags = await prisma.tag.findMany({
    where: { organizationId: orgId },
    orderBy: { name: 'asc' },
  });

  const cacheData: TagCache[] = tags.map((tag) => ({
    name: tag.name,
    color: tag.color || undefined,
  }));

  await cache.set(cacheKey, cacheData, CACHE_TTL.TAGS);
  return cacheData;
}

export async function invalidateTagsCache(orgId: string): Promise<void> {
  const cache = getCache();
  const cacheKey = `${CACHE_PREFIX.TAGS}${orgId}`;
  await cache.del(cacheKey);
}


