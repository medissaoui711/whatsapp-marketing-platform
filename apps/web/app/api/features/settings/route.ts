import { NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuthAndPermission } from '@repo/auth';

export const PUT = withAuthAndPermission('features:manage')(async (request, context) => {
  try {
    const { featureId, settings } = await request.json();

    const existing = await prisma.tenantFeature.findUnique({
      where: { tenantId_featureId: { tenantId: context.tenantId, featureId } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'الميزة غير مفعلة للمؤسسة' }, { status: 404 });
    }

    const updated = await prisma.tenantFeature.update({
      where: { id: existing.id },
      data: { settings },
    });

    return NextResponse.json({
      id: updated.id,
      featureId: updated.featureId,
      settings: updated.settings,
    });
  } catch (error) {
    console.error('Failed to update feature settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
