import { getCache, CACHE_TTL, CACHE_PREFIX } from './index';
import { prisma } from '@repo/db';

export interface SLASettingsCache {
  organizationId: string;
  responseDeadlineMinutes?: number;
  resolutionDeadlineMinutes?: number;
  escalationLevels?: any[];
}

export async function getSLAEnabledSettingsCached(): Promise<SLASettingsCache[]> {
  const cache = getCache();
  const cacheKey = CACHE_PREFIX.SLA_SETTINGS;

  const cached = await cache.get<SLASettingsCache[]>(cacheKey);
  if (cached) return cached;

  const settings = await prisma.chatbotSettings.findMany({
    where: { slaEnabled: true },
  });

  const cacheData: SLASettingsCache[] = settings.map((s) => ({
    organizationId: s.organizationId,
    responseDeadlineMinutes: (s.sla as any)?.responseDeadlineMinutes,
    resolutionDeadlineMinutes: (s.sla as any)?.resolutionDeadlineMinutes,
    escalationLevels: (s.sla as any)?.escalationLevels,
  }));

  await cache.set(cacheKey, cacheData, CACHE_TTL.SLA_SETTINGS);
  return cacheData;
}

export async function invalidateSLASettingsCache(): Promise<void> {
  const cache = getCache();
  await cache.del(CACHE_PREFIX.SLA_SETTINGS);
}


