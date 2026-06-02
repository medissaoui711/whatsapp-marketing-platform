import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuthAndPermission } from '@repo/auth';
import { messageSender } from '@repo/messaging';
import { sendTemplateMessageSchema } from '@repo/shared';
import type { AuthContext } from '@repo/auth';

export const POST = withAuthAndPermission('chat:write')(async (
  request: NextRequest,
  context: AuthContext,
) => {
  const body = await request.json();
  const validation = sendTemplateMessageSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({
      error: 'Validation failed',
      details: validation.error.issues.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    }, { status: 400 });
  }

  const data = validation.data;

  if (!data.contactId && !data.phoneNumber) {
    return NextResponse.json({ error: 'Either contact_id or phone_number is required' }, { status: 400 });
  }

  if (!data.templateName && !data.templateId) {
    return NextResponse.json({ error: 'Either template_name or template_id is required' }, { status: 400 });
  }

  let template;
  if (data.templateId) {
    template = await prisma.template.findFirst({
      where: { id: data.templateId, organizationId: context.tenantId },
    });
  } else {
    template = await prisma.template.findFirst({
      where: { name: data.templateName, organizationId: context.tenantId },
    });
  }

  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  if (template.status !== 'APPROVED') {
    return NextResponse.json({
      error: `Template is not approved (status: ${template.status})`,
    }, { status: 400 });
  }

  let contact;
  if (data.contactId) {
    contact = await prisma.contact.findFirst({
      where: { id: data.contactId, organizationId: context.tenantId },
    });
    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }
  } else {
    const phoneNumber = data.phoneNumber!.replace(/^\+/, '');
    contact = await prisma.contact.findFirst({
      where: { phoneNumber, organizationId: context.tenantId },
    });
    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          organizationId: context.tenantId,
          phoneNumber,
          profileName: '',
        },
      });
    }
  }

  let accountName = data.accountName;
  if (!accountName) {
    accountName = (template as any).whatsappAccount;
  }
  if (!accountName && contact.whatsappAccount) {
    accountName = contact.whatsappAccount;
  }

  const account = await prisma.whatsAppAccount.findFirst({
    where: { name: accountName, organizationId: context.tenantId },
  });

  if (!account) {
    return NextResponse.json({ error: 'WhatsApp account not found' }, { status: 404 });
  }

  if (contact.marketingOptOut && (template as any).category?.toUpperCase() === 'MARKETING') {
    return NextResponse.json({ error: 'Contact has opted out of marketing messages' }, { status: 400 });
  }

  const message = await messageSender.sendOutgoingMessage(
    {
      account,
      contact,
      type: 'template',
      template,
      bodyParams: data.templateParams,
      headerParams: data.headerParams,
      headerMediaId: data.headerMediaId,
      headerMediaFilename: data.headerMediaFilename,
      buttonUrlParams: data.buttonParams,
    },
    {
      broadcastWebSocket: true,
      dispatchWebhook: true,
      trackSLA: false,
      sentByUserId: context.userId,
      async: true,
      markIncomingRead: false,
    },
  );

  return NextResponse.json({
    id: message.id,
    contactId: message.contactId,
    direction: message.direction,
    messageType: message.messageType,
    content: { body: message.content },
    interactiveData: message.interactiveData,
    status: message.status,
    isReply: message.isReply,
    whatsappAccount: message.whatsappAccount,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  });
});


