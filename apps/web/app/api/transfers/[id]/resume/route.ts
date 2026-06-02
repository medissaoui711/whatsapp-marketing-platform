import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuthAndPermission } from '@repo/auth';
import type { AuthContext } from '@repo/auth';

export const POST = withAuthAndPermission('transfers:update')(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } }
) => {
  const transfer = await prisma.agentTransfer.findFirst({
    where: { id: params.id, organizationId: context.tenantId },
  });

  if (!transfer) {
    return NextResponse.json({ error: 'التحويل غير موجود' }, { status: 404 });
  }

  if (transfer.status !== 'active') {
    return NextResponse.json({ error: 'التحويل ليس نشطاً' }, { status: 400 });
  }

  const now = new Date();
  await prisma.agentTransfer.update({
    where: { id: params.id },
    data: { status: 'resumed', resumedAt: now, resumedById: context.userId },
  });

  await prisma.contact.update({
    where: { id: transfer.contactId },
    data: { chatbotLastMessageAt: null, chatbotReminderSent: false },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: context.tenantId,
      resourceType: 'agentTransfer',
      resourceId: transfer.id,
      userId: context.userId,
      userName: context.email,
      action: 'updated',
      changes: JSON.stringify([{ field: 'status', oldValue: 'active', newValue: 'resumed' }]),
    },
  });

  return NextResponse.json({ message: 'تمت إعادة التحويل إلى البوت. البوت نشط الآن لهذه جهة الاتصال.' });
});
