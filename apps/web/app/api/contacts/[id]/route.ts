import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { updateContactSchema } from '@repo/shared';
import { withAuthAndPermission } from '@repo/auth';
import type { AuthContext } from '@repo/auth';
import type { ContactResponse } from '@repo/shared';
import { maskPhoneNumber, maskIfPhoneNumber, shouldMaskPhoneNumbers } from '@/lib/utils';
import { logAudit } from '@repo/audit';

export const GET = withAuthAndPermission('contacts:read')(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } },
) => {
  const isAdmin = context.role === 'owner' || context.role === 'super_admin' || context.role === 'admin';

  const where: any = { id: params.id, organizationId: context.tenantId };

  if (!isAdmin) {
    const activeTransfers = await prisma.agentTransfer.findMany({
      where: { organizationId: context.tenantId, agentId: context.userId, status: 'active' },
      select: { contactId: true },
    });
    const transferContactIds = activeTransfers.map((t) => t.contactId);

    where.OR = [
      { assignedUserId: context.userId },
      { id: { in: transferContactIds } },
    ];
  }

  const contact = await prisma.contact.findFirst({ where });

  if (!contact) {
    return NextResponse.json({ error: 'جهة الاتصال غير موجودة' }, { status: 404 });
  }

  const unreadCount = await prisma.message.count({
    where: { contactId: contact.id, direction: 'incoming', status: { not: 'read' } },
  });

  const shouldMask = await shouldMaskPhoneNumbers(context.tenantId);
  const tags = (contact.tags as string[]) || [];
  const serviceWindowOpen = !!(
    contact.lastInboundAt &&
    Date.now() - new Date(contact.lastInboundAt).getTime() < 24 * 60 * 60 * 1000
  );

  const response: ContactResponse = {
    id: contact.id,
    phoneNumber: shouldMask ? maskPhoneNumber(contact.phoneNumber) : contact.phoneNumber,
    profileName: (shouldMask ? maskIfPhoneNumber(contact.profileName) : contact.profileName) ?? null,
    tags,
    metadata: (contact.metadata as Record<string, any>) || {},
    assignedUserId: contact.assignedUserId,
    whatsappAccount: contact.whatsappAccount,
    lastMessageAt: contact.lastMessageAt?.toISOString() ?? null,
    lastMessagePreview: contact.lastMessagePreview || '',
    isRead: contact.isRead,
    lastInboundAt: contact.lastInboundAt?.toISOString() ?? null,
    serviceWindowOpen,
    marketingOptOut: contact.marketingOptOut,
    createdAt: contact.createdAt.toISOString(),
    updatedAt: contact.updatedAt.toISOString(),
  };

  return NextResponse.json(response);
});

export const PUT = withAuthAndPermission('contacts:update')(async (
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
  const validation = updateContactSchema.safeParse(body);

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
  const updateData: any = {};

  if (data.profileName !== undefined) updateData.profileName = data.profileName;
  if (data.whatsappAccount !== undefined) updateData.whatsappAccount = data.whatsappAccount;
  if (data.tags !== undefined) updateData.tags = data.tags;
  if (data.metadata !== undefined) updateData.metadata = data.metadata;

  if (data.clearAssignedAgent === true) {
    updateData.assignedUserId = null;
  } else if (data.assignedUserId) {
    const user = await prisma.user.findFirst({
      where: { id: data.assignedUserId, organizationId: context.tenantId },
    });
    if (!user) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 400 });
    }
    updateData.assignedUserId = data.assignedUserId;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'لا توجد حقول للتحديث' }, { status: 400 });
  }

  const updated = await prisma.contact.update({
    where: { id: params.id },
    data: updateData,
  });

  await logAudit(
    context.userId,
    context.email,
    'contact',
    updated.id,
    'updated',
    Object.entries(updateData).map(([field, value]) => ({ field, oldValue: (contact as any)[field], newValue: value })),
    context.tenantId,
  );

  const tags = (updated.tags as string[]) || [];

  const response: ContactResponse = {
    id: updated.id,
    phoneNumber: updated.phoneNumber,
    profileName: updated.profileName,
    tags,
    metadata: (updated.metadata as Record<string, any>) || {},
    assignedUserId: updated.assignedUserId,
    whatsappAccount: updated.whatsappAccount,
    lastMessageAt: updated.lastMessageAt?.toISOString() ?? null,
    lastMessagePreview: updated.lastMessagePreview || '',
    isRead: updated.isRead,
    lastInboundAt: updated.lastInboundAt?.toISOString() ?? null,
    serviceWindowOpen: false,
    marketingOptOut: updated.marketingOptOut,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };

  return NextResponse.json(response);
});

export const DELETE = withAuthAndPermission('contacts:delete')(async (
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

  await prisma.contact.delete({ where: { id: params.id } });

  await logAudit(
    context.userId,
    context.email,
    'contact',
    params.id,
    'deleted',
    [{ field: 'phoneNumber', oldValue: contact.phoneNumber }],
    context.tenantId,
  );

  return NextResponse.json({ message: 'تم حذف جهة الاتصال' });
});
