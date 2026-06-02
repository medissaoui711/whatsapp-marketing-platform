import { getCache, CACHE_TTL, CACHE_PREFIX } from './index';
import { prisma } from '@repo/db';

export interface DashboardStatsCache {
  totalMessages: number;
  totalContacts: number;
  totalChatbotSessions: number;
  totalCampaigns: number;
  activeCampaigns: number;
  messagesSent: number;
  messagesReceived: number;
  messagesChange: number;
  contactsChange: number;
  chatbotSessionsChange: number;
  campaignsChange: number;
  recentMessages: Array<{
    id: string;
    contactId: string;
    contactName: string;
    phoneNumber: string;
    content: string;
    direction: string;
    messageType: string;
    sentByUserName: string | null;
    createdAt: string;
  }>;
}

export async function getDashboardStatsCached(orgId: string): Promise<DashboardStatsCache | null> {
  const cache = getCache();
  const cacheKey = `${CACHE_PREFIX.DASHBOARD_STATS}${orgId}`;

  const cached = await cache.get<DashboardStatsCache>(cacheKey);
  if (cached) return cached;

  return null;
}

export async function setDashboardStatsCache(
  orgId: string,
  stats: DashboardStatsCache,
): Promise<void> {
  const cache = getCache();
  const cacheKey = `${CACHE_PREFIX.DASHBOARD_STATS}${orgId}`;
  await cache.set(cacheKey, stats, CACHE_TTL.DASHBOARD_STATS);
}

export async function invalidateDashboardStatsCache(orgId: string): Promise<void> {
  const cache = getCache();
  await cache.del(`${CACHE_PREFIX.DASHBOARD_STATS}${orgId}`);
}
