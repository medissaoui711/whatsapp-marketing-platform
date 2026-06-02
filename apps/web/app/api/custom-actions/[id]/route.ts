import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { updateCustomActionSchema } from '@repo/shared';
import type { CustomActionResponse } from '@repo/shared';
import { withAuthAndPermission } from '@repo/auth';
import type { AuthContext } from '@repo/auth';
import { logAudit } from '@repo/audit';

export const GET = withAuthAndPermission('custom_actions:read')(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } },
) => {
  const action = await prisma.customAction.findFirst({
    where: { id: params.id, organizationId: context.tenantId },
  });

  if (!action) {
    return NextResponse.json({ error: 'الإجراء غير موجود' }, { status: 404 });
  }

  const response: CustomActionResponse = {
    id: action.id,
    name: action.name,
    icon: action.icon || '',
    actionType: action.actionType as any,
    config: action.config as Record<string, any>,
    isActive: action.isActive,
    displayOrder: action.displayOrder,
    createdAt: action.createdAt.toISOString(),
    updatedAt: action.updatedAt.toISOString(),
  };

  return NextResponse.json(response);
});

export const PUT = withAuthAndPermission('custom_actions:update')(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } },
) => {
  const action = await prisma.customAction.findFirst({
    where: { id: params.id, organizationId: context.tenantId },
  });

  if (!action) {
    return NextResponse.json({ error: 'الإجراء غير موجود' }, { status: 404 });
  }

  const body = await request.json();
  const validation = updateCustomActionSchema.safeParse(body);

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
  const updateData: any = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.icon !== undefined) updateData.icon = data.icon;
  if (data.actionType !== undefined) updateData.actionType = data.actionType;
  if (data.config !== undefined) updateData.config = data.config;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.displayOrder !== undefined) updateData.displayOrder = data.displayOrder;

  const updated = await prisma.customAction.update({
    where: { id: params.id },
    data: updateData,
  });

  await logAudit(
    context.userId,
    context.email,
    'custom_action',
    action.id,
    'updated',
    [{ field: 'name', newValue: updated.name }],
    context.tenantId,
  );

  const response: CustomActionResponse = {
    id: updated.id,
    name: updated.name,
    icon: updated.icon || '',
    actionType: updated.actionType as any,
    config: updated.config as Record<string, any>,
    isActive: updated.isActive,
    displayOrder: updated.displayOrder,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };

  return NextResponse.json(response);
});

export const DELETE = withAuthAndPermission('custom_actions:delete')(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } },
) => {
  const action = await prisma.customAction.findFirst({
    where: { id: params.id, organizationId: context.tenantId },
  });

  if (!action) {
    return NextResponse.json({ error: 'الإجراء غير موجود' }, { status: 404 });
  }

  await prisma.customAction.delete({
    where: { id: params.id },
  });

  await logAudit(
    context.userId,
    context.email,
    'custom_action',
    action.id,
    'deleted',
    [{ field: 'name', oldValue: action.name }],
    context.tenantId,
  );

  return NextResponse.json({ status: 'deleted' });
});
