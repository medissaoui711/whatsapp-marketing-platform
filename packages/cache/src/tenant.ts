import { getCache, CACHE_TTL, CACHE_PREFIX } from './index';
import { prisma } from '@repo/db';

export interface TenantSettingsCache {
  id: string;
  name: string;
  subdomain?: string;
  plan: string;
  settings: Record<string, unknown>;
}

export async function getTenantSettingsCached(tenantId: string): Promise<TenantSettingsCache | null> {
  const cache = getCache();
  const cacheKey = `${CACHE_PREFIX.TENANT}${tenantId}:settings`;

  const cached = await cache.get<TenantSettingsCache>(cacheKey);
  if (cached) return cached;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true, subdomain: true, plan: true, settings: true },
  });

  if (!tenant) return null;

  const cacheData: TenantSettingsCache = {
    id: tenant.id,
    name: tenant.name,
    subdomain: tenant.subdomain || undefined,
    plan: tenant.plan,
    settings: (tenant.settings || {}) as Record<string, unknown>,
  };

  await cache.set(cacheKey, cacheData, CACHE_TTL.TENANT_SETTINGS);
  return cacheData;
}

export async function invalidateTenantSettingsCache(tenantId: string): Promise<void> {
  const cache = getCache();
  await cache.del(`${CACHE_PREFIX.TENANT}${tenantId}:settings`);
}
