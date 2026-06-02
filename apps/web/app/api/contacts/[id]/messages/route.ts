import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuthAndPermission } from '@repo/auth';
import type { AuthContext } from '@repo/auth';
import type { MessageResponse } from '@repo/shared';
import type { Prisma } from '@prisma/client';

export const GET = withAuthAndPermission('contacts:read')(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } },
) => {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const beforeId = searchParams.get('before_id');

  const contact = await prisma.contact.findFirst({
    where: { id: params.id, organizationId: context.tenantId },
  });

  if (!contact) {
    return NextResponse.json({ error: 'جهة الاتصال غير موجودة' }, { status: 404 });
  }

  const whereMessage: any = { contactId: contact.id };
  let messages: any[] = [];
  let total;
  let hasMore = false;

  if (beforeId) {
    const beforeMessage = await prisma.message.findUnique({
      where: { id: beforeId },
      select: { createdAt: true },
    });

    if (beforeMessage) {
      whereMessage.createdAt = { lt: beforeMessage.createdAt };
      messages = await prisma.message.findMany({
        where: whereMessage,
        include: { replyToMessage: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      hasMore = messages.length === limit;
      messages.reverse();
    } else {
      messages = [];
    }

    total = await prisma.message.count({ where: whereMessage });
  } else {
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    total = await prisma.message.count({ where: whereMessage });

    messages = await prisma.message.findMany({
      where: whereMessage,
      include: { replyToMessage: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });
    messages.reverse();

    await prisma.message.updateMany({
      where: { contactId: contact.id, direction: 'incoming', status: { not: 'read' } },
      data: { status: 'read' },
    });

    await prisma.contact.update({
      where: { id: contact.id },
      data: { isRead: true },
    });
  }

  const response: MessageResponse[] = messages.map((msg) => ({
    id: msg.id,
    contactId: msg.contactId,
    direction: msg.direction as 'incoming' | 'outgoing',
    messageType: msg.messageType,
    content: msg.content,
    mediaUrl: msg.mediaUrl || undefined,
    mediaMimeType: msg.mediaMimeType || undefined,
    mediaFilename: msg.mediaFilename || undefined,
    interactiveData: (msg.interactiveData as Record<string, any>) || undefined,
    status: msg.status,
    wamid: msg.whatsappMessageId,
    errorMessage: msg.errorMessage,
    isReply: msg.isReply,
    replyToMessageId: msg.replyToMessageId || undefined,
    replyToMessage: msg.replyToMessage
      ? {
          id: msg.replyToMessage.id,
          content: msg.replyToMessage.content,
          messageType: msg.replyToMessage.messageType,
          direction: msg.replyToMessage.direction,
        }
      : undefined,
    whatsappAccount: msg.whatsappAccount,
    createdAt: msg.createdAt.toISOString(),
    updatedAt: msg.updatedAt.toISOString(),
  }));

  const result: any = { messages: response, total, hasMore };
  if (!beforeId) {
    result.page = parseInt(searchParams.get('page') || '1');
    result.limit = limit;
  }

  return NextResponse.json(result);
});
