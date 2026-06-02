import { getCache, CACHE_TTL, CACHE_PREFIX } from './index';
import { prisma } from '@repo/db';

export interface ChatbotFlowCache {
  id: string;
  name: string;
  triggerKeywords?: string[];
  steps: any[];
  isEnabled: boolean;
}

export async function getChatbotFlowsCached(orgId: string): Promise<ChatbotFlowCache[]> {
  const cache = getCache();
  const cacheKey = `${CACHE_PREFIX.FLOWS}${orgId}`;

  const cached = await cache.get<ChatbotFlowCache[]>(cacheKey);
  if (cached) return cached;

  const flows = await prisma.chatbotFlow.findMany({
    where: {
      organizationId: orgId,
      isEnabled: true,
    },
  });

  const cacheData: ChatbotFlowCache[] = flows.map((flow) => ({
    id: flow.id,
    name: flow.name,
    triggerKeywords: flow.triggerKeywords as string[] | undefined,
    steps: flow.steps as any[],
    isEnabled: flow.isEnabled,
  }));

  await cache.set(cacheKey, cacheData, CACHE_TTL.FLOWS);
  return cacheData;
}

export async function getChatbotFlowByIdCached(
  orgId: string,
  flowId: string,
): Promise<ChatbotFlowCache | null> {
  const flows = await getChatbotFlowsCached(orgId);
  return flows.find((flow) => flow.id === flowId) || null;
}

export async function invalidateChatbotFlowsCache(orgId: string): Promise<void> {
  const cache = getCache();
  await cache.del(`${CACHE_PREFIX.FLOWS}${orgId}`);
}


