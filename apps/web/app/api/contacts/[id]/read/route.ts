import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuthAndPermission } from '@repo/auth';
import type { AuthContext } from '@repo/auth';

export const POST = withAuthAndPermission('contacts:update')(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } },
) => {
  const contact = await prisma.contact.findFirst({
    where: { id: params.id, organizationId: context.tenantId },
  });

  if (!contact) {
    return NextResponse.json({ error: 'جهة الاتصال غير موجودة' }, { status: 404 });
  }

  await prisma.message.updateMany({
    where: { contactId: contact.id, direction: 'incoming', status: { not: 'read' } },
    data: { status: 'read' },
  });

  await prisma.contact.update({
    where: { id: contact.id },
    data: { isRead: true },
  });

  if (contact.whatsappAccount) {
    const account = await prisma.whatsAppAccount.findFirst({
      where: { name: contact.whatsappAccount, organizationId: context.tenantId, autoReadReceipt: true },
    });
  }

  return NextResponse.json({ status: 'ok' });
});
