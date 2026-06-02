import { NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuthAndPermission } from '@repo/auth';

export const POST = withAuthAndPermission('features:manage')(async (request, context) => {
  try {
    const { featureId, isActive } = await request.json();

    const feature = await prisma.feature.findUnique({ where: { id: featureId } });
    if (!feature) {
      return NextResponse.json({ error: 'الميزة غير موجودة' }, { status: 404 });
    }

    const tenantFeature = await prisma.tenantFeature.upsert({
      where: {
        tenantId_featureId: { tenantId: context.tenantId, featureId },
      },
      update: { isActive },
      create: {
        tenantId: context.tenantId,
        featureId,
        isActive,
        settings: feature.configSchema || {},
      },
    });

    return NextResponse.json({
      id: tenantFeature.id,
      featureId: tenantFeature.featureId,
      isActive: tenantFeature.isActive,
    });
  } catch (error) {
    console.error('Failed to toggle feature:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
