import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { conversationNoteSchema } from '@repo/shared';
import { withAuthAndPermission } from '@repo/auth';
import type { AuthContext } from '@repo/auth';
import type { ConversationNoteResponse } from '@repo/shared';
import { getWebSocketHub } from '@/lib/websocket';
import { logAudit } from '@repo/audit';

export const GET = withAuthAndPermission('chat:read')(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } },
) => {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 100);

  const contact = await prisma.contact.findFirst({
    where: { id: params.id, organizationId: context.tenantId },
  });

  if (!contact) {
    return NextResponse.json({ error: 'جهة الاتصال غير موجودة' }, { status: 404 });
  }

  const whereNote: any = {
    organizationId: context.tenantId,
    contactId: contact.id,
  };

  const total = await prisma.conversationNote.count({ where: whereNote });

  const notes = await prisma.conversationNote.findMany({
    where: whereNote,
    include: {
      createdBy: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  notes.reverse();

  const result: ConversationNoteResponse[] = notes.map((note) => ({
    id: note.id,
    contactId: note.contactId,
    createdById: note.createdById,
    createdByName: note.createdBy?.fullName || note.createdBy?.email || 'غير معروف',
    content: note.content,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  }));

  return NextResponse.json({
    notes: result,
    total,
    hasMore: notes.length === limit,
  });
});

export const POST = withAuthAndPermission('chat:write')(async (
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

  const body = await request.json();
  const validation = conversationNoteSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({
      error: 'فشل التحقق من صحة البيانات',
      details: validation.error.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    }, { status: 400 });
  }

  const note = await prisma.conversationNote.create({
    data: {
      organizationId: context.tenantId,
      contactId: contact.id,
      createdById: context.userId,
      content: validation.data.content,
    },
    include: {
      createdBy: { select: { id: true, fullName: true, email: true } },
    },
  });

  const response: ConversationNoteResponse = {
    id: note.id,
    contactId: note.contactId,
    createdById: note.createdById,
    createdByName: note.createdBy?.fullName || note.createdBy?.email || 'غير معروف',
    content: note.content,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };

  const wsHub = getWebSocketHub();
  if (wsHub) {
    wsHub.broadcastToContact(context.tenantId, contact.id, {
      type: 'conversation_note_created',
      payload: response,
    });
  }

  await logAudit(
    context.userId,
    context.email,
    'conversationNote',
    note.id,
    'created',
    [{ field: 'contactId', newValue: contact.id }],
    context.tenantId,
  );

  return NextResponse.json(response, { status: 201 });
});
