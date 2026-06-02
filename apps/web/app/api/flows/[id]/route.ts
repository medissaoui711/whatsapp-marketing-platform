import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { updateFlowSchema } from '@repo/shared';
import type { FlowResponse } from '@repo/shared';
import { withAuthAndPermission } from '@repo/auth';
import type { AuthContext } from '@repo/auth';
import { logAudit } from '@repo/audit';

export const GET = withAuthAndPermission('flows:read')(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } },
) => {
  const flow = await prisma.whatsAppFlow.findFirst({
    where: { id: params.id, organizationId: context.tenantId },
  });

  if (!flow) {
    return NextResponse.json({ error: 'التدفق غير موجود' }, { status: 404 });
  }

  const response: FlowResponse = {
    id: flow.id,
    whatsappAccount: flow.whatsappAccount,
    metaFlowId: flow.metaFlowId || '',
    name: flow.name,
    status: flow.status as any,
    category: flow.category || '',
    jsonVersion: flow.jsonVersion,
    flowJson: (flow.flowJson || {}) as Record<string, any>,
    screens: (flow.screens || []) as any[],
    previewUrl: flow.previewUrl || '',
    hasLocalChanges: flow.hasLocalChanges,
    createdAt: flow.createdAt.toISOString(),
    updatedAt: flow.updatedAt.toISOString(),
  };

  return NextResponse.json({ flow: response });
});

export const PUT = withAuthAndPermission('flows:update')(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } },
) => {
  const flow = await prisma.whatsAppFlow.findFirst({
    where: { id: params.id, organizationId: context.tenantId },
  });

  if (!flow) {
    return NextResponse.json({ error: 'التدفق غير موجود' }, { status: 404 });
  }

  const body = await request.json();
  const validation = updateFlowSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({
      error: 'فشل التحقق من صحة البيانات',
      details: validation.error.issues.map((e: any) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    }, { status: 400 });
  }

  const data = validation.data;
  const updateData: any = { hasLocalChanges: true };

  if (data.name !== undefined) updateData.name = data.name;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.jsonVersion !== undefined) updateData.jsonVersion = data.jsonVersion;
  if (data.flowJson !== undefined) updateData.flowJson = data.flowJson;
  if (data.screens !== undefined) updateData.screens = data.screens;

  const updated = await prisma.whatsAppFlow.update({
    where: { id: params.id },
    data: updateData,
  });

  await logAudit(
    context.userId, context.email,
    'whatsAppFlow', flow.id, 'updated',
    [{ field: 'name', newValue: updated.name }],
    context.tenantId,
  );

  const response: FlowResponse = {
    id: updated.id,
    whatsappAccount: updated.whatsappAccount,
    metaFlowId: updated.metaFlowId || '',
    name: updated.name,
    status: updated.status as any,
    category: updated.category || '',
    jsonVersion: updated.jsonVersion,
    flowJson: (updated.flowJson || {}) as Record<string, any>,
    screens: (updated.screens || []) as any[],
    previewUrl: updated.previewUrl || '',
    hasLocalChanges: updated.hasLocalChanges,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };

  return NextResponse.json({ flow: response });
});

export const DELETE = withAuthAndPermission('flows:delete')(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } },
) => {
  const flow = await prisma.whatsAppFlow.findFirst({
    where: { id: params.id, organizationId: context.tenantId },
  });

  if (!flow) {
    return NextResponse.json({ error: 'التدفق غير موجود' }, { status: 404 });
  }

  await prisma.whatsAppFlow.delete({ where: { id: params.id } });

  await logAudit(
    context.userId, context.email,
    'whatsAppFlow', flow.id, 'deleted',
    [{ field: 'name', oldValue: flow.name }],
    context.tenantId,
  );

  return NextResponse.json({ message: 'تم حذف التدفق' });
});
