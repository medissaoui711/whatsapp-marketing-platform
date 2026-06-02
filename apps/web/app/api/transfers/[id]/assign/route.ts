import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { assignTransferSchema } from '@repo/shared';
import { withAuthAndPermission } from '@repo/auth';
import type { AuthContext } from '@repo/auth';

export const POST = withAuthAndPermission('transfers:assign')(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } }
) => {
  const body = await request.json();
  const validation = assignTransferSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({
      error: 'فشل التحقق من صحة البيانات',
      details: validation.error.issues.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    }, { status: 400 });
  }

  const data = validation.data;
  const hasFullAccess = context.role === 'owner' || context.role === 'admin';

  const transfer = await prisma.agentTransfer.findFirst({
    where: { id: params.id, organizationId: context.tenantId },
    include: { contact: true },
  });

  if (!transfer) {
    return NextResponse.json({ error: 'التحويل غير موجود' }, { status: 404 });
  }

  if (transfer.status !== 'active') {
    return NextResponse.json({ error: 'التحويل ليس نشطاً' }, { status: 400 });
  }

  let targetAgentId: string | null = null;

  if (data.agentId !== undefined) {
    if (data.agentId === null) {
      targetAgentId = null;
    } else {
      if (!hasFullAccess && data.agentId !== context.userId) {
        return NextResponse.json({ error: 'ليس لديك صلاحية تعيين التحويل لوكلاء آخرين' }, { status: 403 });
      }

      const agent = await prisma.user.findFirst({
        where: { id: data.agentId, organizationId: context.tenantId, isActive: true },
      });
      if (!agent) return NextResponse.json({ error: 'الوكيل غير موجود' }, { status: 404 });
      if (!agent.isAvailable) return NextResponse.json({ error: 'الوكيل غير متاح حالياً' }, { status: 400 });
      targetAgentId = data.agentId;
    }
  } else if (!hasFullAccess) {
    targetAgentId = context.userId;
  }

  if (data.teamId !== undefined && hasFullAccess) {
    if (data.teamId === null) {
      await prisma.agentTransfer.update({ where: { id: params.id }, data: { teamId: null } });
    } else {
      const team = await prisma.team.findFirst({
        where: { id: data.teamId, organizationId: context.tenantId },
      });
      if (!team) return NextResponse.json({ error: 'الفريق غير موجود' }, { status: 404 });
      await prisma.agentTransfer.update({ where: { id: params.id }, data: { teamId: data.teamId } });
    }
  }

  const previousAgentId = transfer.agentId;

  await prisma.agentTransfer.update({
    where: { id: params.id },
    data: {
      agentId: targetAgentId,
      pickedUpAt: targetAgentId ? new Date() : undefined,
    },
  });

  if (targetAgentId && transfer.contact && !transfer.contact.assignedUserId) {
    const settings = await prisma.chatbotSettings.findFirst({
      where: { organizationId: context.tenantId },
    });
    if (settings?.assignToSameAgent) {
      await prisma.contact.update({
        where: { id: transfer.contactId },
        data: { assignedUserId: targetAgentId },
      });
    }
  } else if (!targetAgentId && previousAgentId && transfer.contact?.assignedUserId === previousAgentId) {
    await prisma.contact.update({
      where: { id: transfer.contactId },
      data: { assignedUserId: null },
    });
  }

  await prisma.auditLog.create({
    data: {
      organizationId: context.tenantId,
      resourceType: 'agentTransfer',
      resourceId: transfer.id,
      userId: context.userId,
      userName: context.email,
      action: 'updated',
      changes: JSON.stringify([{ field: 'agentId', oldValue: previousAgentId, newValue: targetAgentId }]),
    },
  });

  return NextResponse.json({ message: 'تم تعيين التحويل بنجاح', agentId: targetAgentId });
});
