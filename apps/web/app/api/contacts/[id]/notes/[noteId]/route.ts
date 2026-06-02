import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { conversationNoteSchema } from '@repo/shared';
import { withAuthAndPermission } from '@repo/auth';
import type { AuthContext } from '@repo/auth';
import type { ConversationNoteResponse } from '@repo/shared';
import { getWebSocketHub } from '@/lib/websocket';
import { logAudit } from '@repo/audit';

export const PUT = withAuthAndPermission('chat:write')(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string; noteId: string } },
) => {
  const contact = await prisma.contact.findFirst({
    where: { id: params.id, organizationId: context.tenantId },
  });

  if (!contact) {
    return NextResponse.json({ error: 'جهة الاتصال غير موجودة' }, { status: 404 });
  }

  const note = await prisma.conversationNote.findFirst({
    where: { id: params.noteId, organizationId: context.tenantId },
  });

  if (!note) {
    return NextResponse.json({ error: 'الملاحظة غير موجودة' }, { status: 404 });
  }

  if (note.createdById !== context.userId && context.role !== 'owner' && context.role !== 'super_admin') {
    return NextResponse.json({ error: 'يمكنك فقط تعديل ملاحظاتك' }, { status: 403 });
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

  const updatedNote = await prisma.conversationNote.update({
    where: { id: params.noteId },
    data: { content: validation.data.content },
    include: {
      createdBy: { select: { id: true, fullName: true, email: true } },
    },
  });

  const response: ConversationNoteResponse = {
    id: updatedNote.id,
    contactId: updatedNote.contactId,
    createdById: updatedNote.createdById,
    createdByName: updatedNote.createdBy?.fullName || updatedNote.createdBy?.email || 'غير معروف',
    content: updatedNote.content,
    createdAt: updatedNote.createdAt.toISOString(),
    updatedAt: updatedNote.updatedAt.toISOString(),
  };

  const wsHub = getWebSocketHub();
  if (wsHub) {
    wsHub.broadcastToContact(context.tenantId, contact.id, {
      type: 'conversation_note_updated',
      payload: response,
    });
  }

  await logAudit(
    context.userId,
    context.email,
    'conversationNote',
    note.id,
    'updated',
    [{ field: 'content' }],
    context.tenantId,
  );

  return NextResponse.json(response);
});

export const DELETE = withAuthAndPermission('chat:write')(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string; noteId: string } },
) => {
  const contact = await prisma.contact.findFirst({
    where: { id: params.id, organizationId: context.tenantId },
  });

  if (!contact) {
    return NextResponse.json({ error: 'جهة الاتصال غير موجودة' }, { status: 404 });
  }

  const note = await prisma.conversationNote.findFirst({
    where: { id: params.noteId, organizationId: context.tenantId },
  });

  if (!note) {
    return NextResponse.json({ error: 'الملاحظة غير موجودة' }, { status: 404 });
  }

  if (note.createdById !== context.userId && context.role !== 'owner' && context.role !== 'super_admin') {
    return NextResponse.json({ error: 'يمكنك فقط حذف ملاحظاتك' }, { status: 403 });
  }

  const contactId = note.contactId;

  await prisma.conversationNote.delete({
    where: { id: params.noteId },
  });

  const wsHub = getWebSocketHub();
  if (wsHub) {
    wsHub.broadcastToContact(context.tenantId, contactId, {
      type: 'conversation_note_deleted',
      payload: { id: params.noteId, contactId },
    });
  }

  await logAudit(
    context.userId,
    context.email,
    'conversationNote',
    note.id,
    'deleted',
    [{ field: 'contactId', oldValue: contactId }],
    context.tenantId,
  );

  return NextResponse.json({ message: 'تم حذف الملاحظة' });
});
