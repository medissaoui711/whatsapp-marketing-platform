import { getCache, CACHE_TTL, CACHE_PREFIX } from './index';
import { prisma } from '@repo/db';
import { encrypt, decrypt, maskSensitiveConfig } from '@repo/auth';

export interface IntegrationCache {
  id: string;
  type: string;
  config: Record<string, unknown>;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export async function getIntegrationsCached(
  tenantId: string,
  type?: string,
  role?: string,
): Promise<{ integrations: IntegrationCache[]; total: number } | null> {
  const cache = getCache();
  const cacheKey = type
    ? `${CACHE_PREFIX.INTEGRATIONS}${tenantId}:${type}`
    : `${CACHE_PREFIX.INTEGRATIONS}${tenantId}:all`;

  const cached = await cache.get<{ integrations: IntegrationCache[]; total: number }>(cacheKey);
  if (cached && role !== 'viewer') return cached;

  return null;
}

export async function setIntegrationsCache(
  tenantId: string,
  data: { integrations: IntegrationCache[]; total: number },
  type?: string,
): Promise<void> {
  const cache = getCache();
  const cacheKey = type
    ? `${CACHE_PREFIX.INTEGRATIONS}${tenantId}:${type}`
    : `${CACHE_PREFIX.INTEGRATIONS}${tenantId}:all`;
  await cache.set(cacheKey, data, CACHE_TTL.INTEGRATIONS);
}

export async function invalidateIntegrationsCache(tenantId: string): Promise<void> {
  const cache = getCache();
  await cache.deleteByPattern(`${CACHE_PREFIX.INTEGRATIONS}${tenantId}:*`);
}
