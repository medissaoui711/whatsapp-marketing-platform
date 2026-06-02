import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { extractTenantContext } from '@repo/auth';
import { hasPermission } from '@repo/shared';
import { groupSearchService } from '@repo/integrations/whatsapp/groups/search-service';
import { z } from 'zod';

const searchSchema = z.object({
  keyword: z.string().min(2, 'Keyword must be at least 2 characters'),
  source: z.enum(['google', 'telegram', 'github', 'all']).default('all'),
  limit: z.number().min(1).max(50).default(20),
  page: z.number().min(1).default(1),
});

export async function POST(req: NextRequest) {
  try {
    const context = extractTenantContext(req);

    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const feature = await prisma.feature.findUnique({
      where: { key: 'whatsapp_search_groups', isEnabled: true },
    });

    if (!feature) {
      return NextResponse.json(
        { error: 'Group search feature is not available' },
        { status: 403 }
      );
    }

    const tenantFeature = await prisma.tenantFeature.findUnique({
      where: {
        tenantId_featureId: { tenantId: context.tenantId, featureId: feature.id },
      },
    });

    if (!tenantFeature || !tenantFeature.isActive) {
      return NextResponse.json(
        { error: 'Group search is not enabled for your organization' },
        { status: 403 }
      );
    }

    if (!hasPermission(context.role, 'features:use')) {
      return NextResponse.json(
        { error: 'You do not have permission to use this feature' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validation = searchSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const results = await groupSearchService.searchGroups(validation.data, context.tenantId);

    await prisma.featureUsage.create({
      data: {
        tenantId: context.tenantId,
        userId: context.userId,
        featureId: feature.id,
        action: 'search_groups',
        metadata: {
          keyword: validation.data.keyword,
          source: validation.data.source,
          resultsCount: results.groups.length,
          searchId: results.searchId,
        },
      },
    });

    await prisma.tenantFeature.update({
      where: { id: tenantFeature.id },
      data: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error: any) {
    console.error('Group search error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
