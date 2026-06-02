import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuthAndPermission } from '@repo/auth';
import { metaAnalyticsQuerySchema } from '@repo/shared';
import { getMetaAnalytics, refreshMetaAnalyticsCache } from '@repo/analytics';
import type { AuthContext } from '@repo/auth';

export const GET = withAuthAndPermission('analytics:read')(async (
  request: NextRequest,
  context: AuthContext,
) => {
  const { searchParams } = new URL(request.url);
  const queryResult = metaAnalyticsQuerySchema.safeParse({
    accountId: searchParams.get('account_id') || undefined,
    analyticsType: searchParams.get('analytics_type'),
    start: searchParams.get('start'),
    end: searchParams.get('end'),
    granularity: searchParams.get('granularity') || 'DAY',
    templateIds: searchParams.get('template_ids') || undefined,
  });

  if (!queryResult.success) {
    return NextResponse.json({
      error: 'Invalid query parameters',
      details: queryResult.error.issues.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    }, { status: 400 });
  }

  try {
    const result = await getMetaAnalytics(context.tenantId, context.userId, queryResult.data);

    const response: any = { accounts: result.accounts, cached: result.cached };
    if (result.adjustedGranularity) {
      response.adjustedGranularity = result.adjustedGranularity;
    }

    await prisma.auditLog.create({
      data: {
        organizationId: context.tenantId,
        userId: context.userId,
        userName: context.email,
        resourceType: 'analytics',
        resourceId: 'meta',
        action: 'created',
        changes: JSON.stringify([{
          field: 'analytics_view',
          newValue: { analyticsType: queryResult.data.analyticsType, dateRange: `${queryResult.data.start} to ${queryResult.data.end}` },
        }]),
      },
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Meta analytics error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to fetch analytics',
    }, { status: 500 });
  }
});

export const POST = withAuthAndPermission('analytics:write')(async (
  request: NextRequest,
  context: AuthContext,
) => {
  await refreshMetaAnalyticsCache(context.tenantId);

  await prisma.auditLog.create({
    data: {
      organizationId: context.tenantId,
      userId: context.userId,
      userName: context.email,
      resourceType: 'analytics',
      resourceId: 'meta',
      action: 'created',
      changes: JSON.stringify([{ field: 'cache_refresh', newValue: {} }]),
    },
  });

  return NextResponse.json({ message: 'Analytics cache cleared successfully' });
});


