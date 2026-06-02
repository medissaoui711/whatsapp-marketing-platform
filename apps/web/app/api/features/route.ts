import { NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuth } from '@repo/auth';

export const GET = withAuth(async (request, context) => {
  try {
    const features = await prisma.feature.findMany({
      orderBy: { category: 'asc' },
      include: {
        tenantFeatures: {
          where: { tenantId: context.tenantId },
          select: {
            id: true,
            isActive: true,
            settings: true,
            usageCount: true,
            lastUsedAt: true,
          },
        },
      },
    });

    const mapped = features.map((f) => {
      const tf = f.tenantFeatures[0];
      return {
        id: f.id,
        key: f.key,
        name: f.name,
        description: f.description,
        category: f.category,
        isEnabled: f.isEnabled,
        configSchema: f.configSchema,
        isActive: tf?.isActive ?? false,
        settings: tf?.settings ?? {},
        usageCount: tf?.usageCount ?? 0,
        lastUsedAt: tf?.lastUsedAt ?? null,
        tenantFeatureId: tf?.id ?? null,
      };
    });

    return NextResponse.json({ features: mapped });
  } catch (error) {
    console.error('Failed to fetch features:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
