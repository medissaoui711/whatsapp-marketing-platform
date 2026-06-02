import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { createContactSchema } from '@repo/shared';
import { withAuthAndPermission, rateLimit } from '@repo/auth';
import { dispatchWebhook } from '@repo/webhooks';
import type { AuthContext } from '@repo/auth';
import type { ContactResponse } from '@repo/shared';
import { maskPhoneNumber, maskIfPhoneNumber, shouldMaskPhoneNumbers } from '@/lib/utils';

export const GET = withAuthAndPermission('contacts:read')(async (
  request: NextRequest,
  context: AuthContext,
) => {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
  const search = searchParams.get('search') || '';

  const isAdmin = context.role === 'owner' || context.role === 'super_admin' || context.role === 'admin';

  const where: any = { organizationId: context.tenantId };

  if (search && search.length <= 1000) {
    where.OR = [
      { phoneNumber: { contains: search } },
      { profileName: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (!isAdmin) {
    const activeTransfers = await prisma.agentTransfer.findMany({
      where: {
        organizationId: context.tenantId,
        agentId: context.userId,
        status: 'active',
      },
      select: { contactId: true },
    });
    const transferContactIds = activeTransfers.map((t) => t.contactId);

    where.OR = [
      { assignedUserId: context.userId },
      { id: { in: transferContactIds } },
    ];
  }

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.contact.count({ where }),
  ]);

  const contactIds = contacts.map((c) => c.id);
  const unreadCounts = await prisma.message.groupBy({
    by: ['contactId'],
    where: {
      contactId: { in: contactIds },
      direction: 'incoming',
      status: { not: 'read' },
    },
    _count: { id: true },
  });
  const unreadMap = new Map(unreadCounts.map((u) => [u.contactId, u._count.id]));

  const shouldMask = await shouldMaskPhoneNumbers(context.tenantId);

  const response: ContactResponse[] = contacts.map((contact) => {
    const tags = (contact.tags as string[]) || [];
    const serviceWindowOpen = !!(
      contact.lastInboundAt &&
      Date.now() - new Date(contact.lastInboundAt).getTime() < 24 * 60 * 60 * 1000
    );

    return {
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
  });

  return NextResponse.json({ contacts: response, total, page, limit });
});

export const POST = withAuthAndPermission('contacts:create')(async (
  request: NextRequest,
  context: AuthContext,
) => {
  const rateResult = await rateLimit(`contact_create_${context.userId}`, 30, 60 * 1000);
  if (!rateResult.success) {
    return NextResponse.json({
      error: 'طلبات كثيرة جداً',
      retryAfter: Math.ceil((rateResult.resetAt - Date.now()) / 1000),
    }, { status: 429 });
  }

  const body = await request.json();
  const validation = createContactSchema.safeParse(body);

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
  const normalizedPhone = data.phoneNumber.startsWith('+')
    ? data.phoneNumber.substring(1)
    : data.phoneNumber;

  const existingContact = await prisma.contact.findFirst({
    where: {
      organizationId: context.tenantId,
      phoneNumber: normalizedPhone,
    },
  });

  if (existingContact) {
    return NextResponse.json({ error: 'جهة الاتصال موجودة مسبقاً' }, { status: 409 });
  }

  const contact = await prisma.contact.create({
    data: {
      organizationId: context.tenantId,
      phoneNumber: normalizedPhone,
      profileName: data.profileName ?? null,
      whatsappAccount: data.whatsappAccount || null,
      tags: data.tags || [],
      metadata: data.metadata || {},
    },
  });

  const tags = (contact.tags as string[]) || [];

  dispatchWebhook(context.tenantId, 'contact.created', {
    contactId: contact.id,
    phoneNumber: contact.phoneNumber,
    profileName: contact.profileName,
    tags,
    whatsappAccount: contact.whatsappAccount,
  }).catch(() => {});

  const response: ContactResponse = {
    id: contact.id,
    phoneNumber: contact.phoneNumber,
    profileName: contact.profileName ?? null,
    tags,
    metadata: (contact.metadata as Record<string, any>) || {},
    assignedUserId: null,
    whatsappAccount: contact.whatsappAccount,
    lastMessageAt: null,
    lastMessagePreview: '',
    isRead: true,
    lastInboundAt: null,
    serviceWindowOpen: false,
    marketingOptOut: contact.marketingOptOut,
    createdAt: contact.createdAt.toISOString(),
    updatedAt: contact.updatedAt.toISOString(),
  };

  return NextResponse.json(response, { status: 201 });
});


