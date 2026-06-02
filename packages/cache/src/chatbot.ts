import { getCache, CACHE_TTL, CACHE_PREFIX } from './index';
import { prisma } from '@repo/db';

export interface ChatbotSettingsCache {
  id: string;
  organizationId: string;
  whatsAppAccount: string;
  isEnabled: boolean;
  slaEnabled: boolean;
  ai: {
    provider?: string;
    model?: string;
    apiKey?: string;
    context?: string;
  };
  agentAssignment: {
    assignToSameAgent: boolean;
    allowQueuePickup: boolean;
  };
  businessHours: {
    enabled: boolean;
    hours?: any[];
    outOfHoursMessage?: string;
  };
}

export async function getChatbotSettingsCached(
  orgId: string,
  whatsAppAccount: string,
): Promise<ChatbotSettingsCache | null> {
  const cache = getCache();
  const cacheKey = `${CACHE_PREFIX.SETTINGS}${orgId}:${whatsAppAccount}`;

  const cached = await cache.get<ChatbotSettingsCache>(cacheKey);
  if (cached) return cached;

  const settings = await prisma.chatbotSettings.findFirst({
    where: {
      organizationId: orgId,
      OR: [
        { whatsAppAccount },
        { whatsAppAccount: '' },
      ],
    },
    orderBy: {
      whatsAppAccount: 'desc',
    },
  });

  if (!settings) return null;

  const cacheData: ChatbotSettingsCache = {
    id: settings.id,
    organizationId: settings.organizationId,
    whatsAppAccount: settings.whatsAppAccount,
    isEnabled: settings.isEnabled,
    slaEnabled: settings.slaEnabled,
    ai: settings.ai as any,
    agentAssignment: settings.agentAssignment as any,
    businessHours: settings.businessHours as any,
  };

  await cache.set(cacheKey, cacheData, CACHE_TTL.SETTINGS);
  return cacheData;
}

export async function invalidateChatbotSettingsCache(orgId: string): Promise<void> {
  const cache = getCache();
  const pattern = `${CACHE_PREFIX.SETTINGS}${orgId}:*`;
  await cache.deleteByPattern(pattern);
}


