import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { updateIntegrationSchema } from '@repo/shared';
import { withAuthAndPermission, decrypt, encrypt, maskSensitiveConfig } from '@repo/auth';
import type { AuthContext } from '@repo/auth';

export const GET = withAuthAndPermission('integrations:read')(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } }
) => {
  const integration = await prisma.integration.findFirst({
    where: { id: params.id, tenantId: context.tenantId },
  });

  if (!integration) {
    return NextResponse.json({ error: 'التكامل غير موجود' }, { status: 404 });
  }

  let config: Record<string, unknown> = {};
  try {
    const decrypted = JSON.parse(decrypt(integration.config));
    config = maskSensitiveConfig(decrypted as Record<string, unknown>);
  } catch {
    config = { masked: true };
  }

  return NextResponse.json({
    ...integration,
    config,
  });
});

export const PUT = withAuthAndPermission('integrations:update')(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } }
) => {
  const existing = await prisma.integration.findFirst({
    where: { id: params.id, tenantId: context.tenantId },
  });

  if (!existing) {
    return NextResponse.json({ error: 'التكامل غير موجود' }, { status: 404 });
  }

  const body = await request.json();
  const validation = updateIntegrationSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({
      error: 'فشل التحقق من صحة البيانات',
      details: validation.error.issues.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (validation.data.type) updateData.type = validation.data.type;
  if (validation.data.enabled !== undefined) updateData.enabled = validation.data.enabled;

  if (validation.data.config) {
    const mergedConfig = {
      ...JSON.parse(decrypt(existing.config)),
      ...validation.data.config,
    };
    updateData.config = encrypt(JSON.stringify(mergedConfig));
  }

  const integration = await prisma.integration.update({
    where: { id: params.id },
    data: updateData,
  });

  void prisma.auditLog.create({
    data: {
      userId: context.userId,
      action: 'integration.update',
      target: `integration:${integration.id}`,
      details: JSON.stringify({ changes: Object.keys(updateData) }),
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      tenantId: context.tenantId,
    },
  });

  let responseConfig: Record<string, unknown> = {};
  try {
    const decrypted = JSON.parse(decrypt(integration.config));
    responseConfig = maskSensitiveConfig(decrypted as Record<string, unknown>);
  } catch {
    responseConfig = { masked: true };
  }

  return NextResponse.json({
    ...integration,
    config: responseConfig,
  });
});

export const DELETE = withAuthAndPermission('integrations:delete')(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } }
) => {
  const integration = await prisma.integration.findFirst({
    where: { id: params.id, tenantId: context.tenantId },
  });

  if (!integration) {
    return NextResponse.json({ error: 'التكامل غير موجود' }, { status: 404 });
  }

  const hasActiveCampaigns = await prisma.campaign.findFirst({
    where: {
      integrationId: integration.id,
      status: { in: ['processing', 'scheduled'] },
    },
  });

  if (hasActiveCampaigns) {
    return NextResponse.json({
      error: 'لا يمكن حذف تكامل لديه حملات نشطة',
    }, { status: 400 });
  }

  await prisma.integration.delete({ where: { id: params.id } });

  void prisma.auditLog.create({
    data: {
      userId: context.userId,
      action: 'integration.delete',
      target: `integration:${integration.id}`,
      details: JSON.stringify({ type: integration.type }),
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      tenantId: context.tenantId,
    },
  });

  return NextResponse.json({ success: true });
});
