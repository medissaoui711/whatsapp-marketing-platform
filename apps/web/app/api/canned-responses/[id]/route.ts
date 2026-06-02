import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { updateCannedResponseSchema } from '@repo/shared';
import { withAuthAndPermission } from '@repo/auth';
import type { AuthContext } from '@repo/auth';
import type { CannedResponseResponse } from '@repo/shared';
import { logAudit, generateChanges } from '@repo/audit';

async function getCannedResponse(id: string, organizationId: string) {
  return prisma.cannedResponse.findFirst({
    where: { id, organizationId },
    include: { createdBy: { select: { fullName: true } } },
  });
}

function toResponse(cr: any): CannedResponseResponse {
  return {
    id: cr.id,
    name: cr.name,
    shortcut: cr.shortcut,
    content: cr.content,
    category: cr.category,
    isActive: cr.isActive,
    usageCount: cr.usageCount,
    buttons: cr.buttons as any,
    createdById: cr.createdById,
    createdByName: cr.createdBy?.fullName ?? null,
    createdAt: cr.createdAt.toISOString(),
    updatedAt: cr.updatedAt.toISOString(),
  };
}

export const GET = withAuthAndPermission('canned_responses:read')(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } },
) => {
  const cannedResponse = await getCannedResponse(params.id, context.tenantId);

  if (!cannedResponse) {
    return NextResponse.json({ error: 'الرد الجاهز غير موجود' }, { status: 404 });
  }

  return NextResponse.json(toResponse(cannedResponse));
});

export const PUT = withAuthAndPermission('canned_responses:update')(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } },
) => {
  const existing = await getCannedResponse(params.id, context.tenantId);

  if (!existing) {
    return NextResponse.json({ error: 'الرد الجاهز غير موجود' }, { status: 404 });
  }

  const body = await request.json();
  const validation = updateCannedResponseSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({
      error: 'فشل التحقق من صحة البيانات',
      details: validation.error.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    }, { status: 400 });
  }

  const data = validation.data;

  if (data.shortcut) {
    const duplicate = await prisma.cannedResponse.findFirst({
      where: {
        organizationId: context.tenantId,
        shortcut: data.shortcut.trim(),
        id: { not: params.id },
      },
    });
    if (duplicate) {
      return NextResponse.json({ error: 'الاختصار مستخدم مسبقاً' }, { status: 409 });
    }
  }

  const updateData: any = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.shortcut !== undefined) updateData.shortcut = data.shortcut.trim() || null;
  if (data.content !== undefined) updateData.content = data.content;
  if (data.category !== undefined) updateData.category = data.category?.trim() || null;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.buttons !== undefined) updateData.buttons = data.buttons;

  const updated = await prisma.cannedResponse.update({
    where: { id: params.id },
    data: updateData,
    include: { createdBy: { select: { fullName: true } } },
  });

  const changes = generateChanges(existing, updateData);
  await logAudit(
    context.userId,
    context.email,
    'cannedResponse',
    updated.id,
    'updated',
    changes,
    context.tenantId,
  );

  return NextResponse.json(toResponse(updated));
});

export const DELETE = withAuthAndPermission('canned_responses:delete')(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } },
) => {
  const existing = await getCannedResponse(params.id, context.tenantId);

  if (!existing) {
    return NextResponse.json({ error: 'الرد الجاهز غير موجود' }, { status: 404 });
  }

  await prisma.cannedResponse.delete({ where: { id: params.id } });

  await logAudit(
    context.userId,
    context.email,
    'cannedResponse',
    params.id,
    'deleted',
    [{ field: 'name', oldValue: existing.name }],
    context.tenantId,
  );

  return NextResponse.json({ message: 'تم حذف الرد الجاهز بنجاح' });
});
