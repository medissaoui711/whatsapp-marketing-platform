import { prisma } from '@repo/db';
import { WhatsAppClient } from '@repo/integrations';
import { decrypt } from '@repo/auth/encryption';
import { getCache, CACHE_PREFIX } from '@repo/cache';
import { subDays } from 'date-fns';
import type { MetaAnalyticsQuery, MetaAnalyticsResponse } from '@repo/shared/src/schemas/analytics';

const ANALYTICS_CACHE_TTL = {
  HALF_HOUR: 60 * 60,
  DAY: 3 * 60 * 60,
  MONTH: 6 * 60 * 60,
};

function getCacheTTL(granularity: string): number {
  switch (granularity) {
    case 'HALF_HOUR': return ANALYTICS_CACHE_TTL.HALF_HOUR;
    case 'MONTH': return ANALYTICS_CACHE_TTL.MONTH;
    default: return ANALYTICS_CACHE_TTL.DAY;
  }
}

function buildCacheKey(
  orgId: string,
  accountId: string | undefined,
  analyticsType: string,
  start: number,
  end: number,
  granularity: string,
): string {
  const accId = accountId || 'all';
  return `${CACHE_PREFIX.META_ANALYTICS}${orgId}:${accId}:${analyticsType}:${start}:${end}:${granularity}`;
}

export async function getMetaAnalytics(
  orgId: string,
  userId: string,
  query: MetaAnalyticsQuery,
): Promise<{ accounts: MetaAnalyticsResponse[]; cached: boolean; adjustedGranularity?: string }> {
  const { accountId, analyticsType, start, end, granularity, templateIds } = query;

  const startDate = new Date(start);
  const endDate = new Date(end);
  endDate.setHours(23, 59, 59, 999);

  const startUnix = Math.floor(startDate.getTime() / 1000);
  const endUnix = Math.floor(endDate.getTime() / 1000);

  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  let finalGranularity = granularity;
  let adjustedGranularity: string | undefined;

  if ((granularity === 'MONTH' || granularity === 'MONTHLY') && daysDiff < 30) {
    finalGranularity = 'DAY';
    adjustedGranularity = 'MONTH';
  }
  if (granularity === 'HALF_HOUR' && daysDiff > 7) {
    finalGranularity = 'DAY';
    adjustedGranularity = 'HALF_HOUR';
  }

  if (analyticsType === 'template_analytics') {
    const ninetyDaysAgo = subDays(new Date(), 90);
    if (startDate < ninetyDaysAgo) {
      throw new Error('Template analytics have a 90-day lookback limit');
    }
  }

  let accounts;
  if (accountId) {
    const account = await prisma.whatsAppAccount.findFirst({
      where: { id: accountId, organizationId: orgId },
    });
    if (!account) throw new Error('Account not found');
    accounts = [account];
  } else {
    accounts = await prisma.whatsAppAccount.findMany({
      where: { organizationId: orgId },
    });
  }

  if (accounts.length === 0) {
    return { accounts: [], cached: false };
  }

  const cache = getCache();
  const cacheKey = buildCacheKey(orgId, accountId, analyticsType, startUnix, endUnix, finalGranularity);
  const cachedData = await cache.get<MetaAnalyticsResponse[]>(cacheKey);

  if (cachedData) {
    return { accounts: cachedData, cached: true };
  }

  const client = new WhatsAppClient();
  const results: MetaAnalyticsResponse[] = [];

  for (const account of accounts) {
    const accessToken = decrypt(account.accessToken);
    const waAccount = {
      phoneId: account.phoneId,
      businessId: account.businessId,
      apiVersion: account.apiVersion,
      accessToken,
    };

    let templateIdList: string[] = [];
    if (analyticsType === 'template_analytics') {
      if (templateIds) {
        try { templateIdList = JSON.parse(templateIds); } catch { templateIdList = []; }
      } else {
        const templates = await prisma.template.findMany({
          where: {
            organizationId: orgId,
            whatsappAccount: account.name,
            metaTemplateId: { not: '' },
          },
          select: { metaTemplateId: true },
        });
        templateIdList = templates.map(t => t.metaTemplateId).filter(Boolean);
      }

      if (templateIdList.length === 0) {
        results.push({ accountId: account.id, accountName: account.name, data: {} });
        continue;
      }
    }

    const analyticsData = await client.getAnalytics(waAccount, analyticsType as any, {
      start: startUnix,
      end: endUnix,
      granularity: finalGranularity,
      templateIds: templateIdList,
    });

    let templateNames: Record<string, string> | undefined;
    if (analyticsType === 'template_analytics' && analyticsData.templateAnalytics?.dataPoints) {
      templateNames = {};
      const uniqueTemplateIds = [...new Set(analyticsData.templateAnalytics.dataPoints.map(dp => dp.templateId))];

      const templates = await prisma.template.findMany({
        where: { organizationId: orgId, metaTemplateId: { in: uniqueTemplateIds } },
        select: { metaTemplateId: true, name: true, displayName: true },
      });

      for (const t of templates) {
        templateNames[t.metaTemplateId] = t.displayName || t.name;
      }
    }

    results.push({ accountId: account.id, accountName: account.name, data: analyticsData, templateNames });
  }

  await cache.set(cacheKey, results, getCacheTTL(finalGranularity));

  return { accounts: results, cached: false, adjustedGranularity: adjustedGranularity ? finalGranularity : undefined };
}

export async function refreshMetaAnalyticsCache(orgId: string): Promise<void> {
  const cache = getCache();
  const pattern = `${CACHE_PREFIX.META_ANALYTICS}${orgId}:*`;
  await cache.deleteByPattern(pattern);
}


