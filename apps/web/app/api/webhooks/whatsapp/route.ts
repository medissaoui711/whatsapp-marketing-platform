import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { getWhatsAppAccountCached } from '@repo/cache';
import { dispatchWebhook } from '@repo/webhooks';
import { Hub } from '@repo/websocket';

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get('hub.mode');
  const token = req.nextUrl.searchParams.get('hub.verify_token');
  const challenge = req.nextUrl.searchParams.get('hub.challenge');

  if (!mode || !token || !challenge) {
    return new NextResponse('Missing parameters', { status: 400 });
  }

  const account = await prisma.whatsAppAccount.findFirst({
    where: { webhookVerifyToken: token, status: 'active' },
    select: { id: true, phoneId: true },
  });

  if (!account) {
    return new NextResponse('Verification failed: invalid token', { status: 403 });
  }

  return new NextResponse(challenge, { status: 200 });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body?.entry) {
    return NextResponse.json({ status: 'ok' });
  }

  const entries = body.entry as Array<Record<string, unknown>>;

  for (const entry of entries) {
    const changes = entry.changes as Array<Record<string, unknown>> || [];

    for (const change of changes) {
      const value = change.value as Record<string, unknown> || {};
      const metadata = value.metadata as Record<string, unknown> || {};
      const phoneNumberId = metadata.phone_number_id as string;

      if (!phoneNumberId) continue;

      const account = await getWhatsAppAccountCached(phoneNumberId);
      if (!account) continue;

      const messages = (value.messages as unknown[]) || [];
      const statuses = (value.statuses as unknown[]) || [];

      for (const msg of messages) {
        await handleIncomingMessage(account, msg as Record<string, unknown>);
      }

      for (const status of statuses) {
        await handleStatusUpdate(account, status as Record<string, unknown>);
      }

      const templateStatusUpdates = value.message_template_status_update as Record<string, unknown>;
      if (templateStatusUpdates) {
        await handleTemplateStatusUpdate(account, templateStatusUpdates);
      }
    }
  }

  return NextResponse.json({ status: 'ok' });
}

async function handleIncomingMessage(
  account: { organizationId: string; name: string },
  msg: Record<string, unknown>,
): Promise<void> {
  const from = msg.from as string;
  const msgId = msg.id as string;
  const timestamp = msg.timestamp as string;

  let contact = await prisma.contact.findFirst({
    where: { organizationId: account.organizationId, phoneNumber: from },
  });

  if (!contact) {
    contact = await prisma.contact.create({
      data: {
        organizationId: account.organizationId,
        phoneNumber: from,
        whatsappAccount: account.name,
        tags: ['whatsapp'],
        metadata: { source: 'whatsapp_webhook' },
      },
    });
  }

  const msgType = msg.type as string;
  let content = '';
  let mediaUrl: string | undefined;
  let mediaMimeType: string | undefined;
  let mediaFilename: string | undefined;
  let interactiveData: Record<string, unknown> | undefined;

  if (msgType === 'text') {
    const textData = msg.text as Record<string, unknown> || {};
    content = textData.body as string || '';
  } else if (msgType === 'image') {
    const img = msg.image as Record<string, unknown> || {};
    mediaUrl = img.link as string || img.id as string;
    mediaMimeType = img.mime_type as string;
    content = (img.caption as string) || '';
  } else if (msgType === 'video') {
    const vid = msg.video as Record<string, unknown> || {};
    mediaUrl = vid.link as string || vid.id as string;
    mediaMimeType = vid.mime_type as string;
    content = (vid.caption as string) || '';
  } else if (msgType === 'audio') {
    const audio = msg.audio as Record<string, unknown> || {};
    mediaUrl = audio.link as string || audio.id as string;
    mediaMimeType = audio.mime_type as string;
  } else if (msgType === 'document') {
    const doc = msg.document as Record<string, unknown> || {};
    mediaUrl = doc.link as string || doc.id as string;
    mediaMimeType = doc.mime_type as string;
    mediaFilename = doc.filename as string;
    content = (doc.caption as string) || '';
  } else if (msgType === 'interactive') {
    interactiveData = msg.interactive as Record<string, unknown>;
    const buttonReply = (msg.interactive as Record<string, unknown>)?.button_reply as Record<string, unknown>;
    if (buttonReply) {
      content = `[${buttonReply.title}]` || '';
    }
  } else if (msgType === 'order') {
    content = '[Order]';
  } else if (msgType === 'system') {
    const sys = msg.system as Record<string, unknown> || {};
    content = `[System: ${sys.body}]`;
  } else if (msgType === 'unknown') {
    return;
  }

  const message = await prisma.message.create({
    data: {
      organizationId: account.organizationId,
      contactId: contact.id,
      whatsappAccount: account.name,
      whatsappMessageId: msgId,
      direction: 'incoming',
      messageType: mapMsgType(msgType),
      content: content || null,
      mediaUrl: mediaUrl || null,
      mediaMimeType: mediaMimeType || null,
      mediaFilename: mediaFilename || null,
      interactiveData: interactiveData || undefined,
      status: 'received',
      metadata: { timestamp: parseInt(timestamp) * 1000 },
    },
  });

  await prisma.contact.update({
    where: { id: contact.id },
    data: {
      lastMessageAt: new Date(),
      lastMessagePreview: content.slice(0, 100) || `[${msgType}]`,
      lastInboundAt: new Date(),
      isRead: false,
    },
  });

  dispatchWebhook(account.organizationId, 'message.incoming', {
    messageId: message.id,
    contactId: contact.id,
    contactPhone: from,
    messageType: msgType,
    content,
    whatsappAccount: account.name,
    direction: 'incoming',
  }).catch(() => {});

  broadcast(account.organizationId, {
    type: 'INCOMING_MESSAGE',
    payload: {
      message_id: message.id,
      contact_id: contact.id,
      phone: from,
      profile_name: contact.profileName,
      content,
      message_type: msgType,
      media_url: mediaUrl,
      created_at: message.createdAt.toISOString(),
    },
  });
}

async function handleStatusUpdate(
  account: { organizationId: string },
  status: Record<string, unknown>,
): Promise<void> {
  const msgId = status.id as string;
  const statusEvent = status.status as string;
  const timestamp = status.status_timestamp as number;
  const date = timestamp ? new Date(timestamp * 1000) : new Date();

  const statusMap: Record<string, string> = {
    sent: 'sent',
    delivered: 'delivered',
    read: 'read',
    failed: 'failed',
  };

  const dbStatus = statusMap[statusEvent];
  if (!dbStatus) return;

  const updateData: Record<string, unknown> = { status: dbStatus };
  if (statusEvent === 'sent') updateData.sentAt = date;
  if (statusEvent === 'delivered') updateData.deliveredAt = date;
  if (statusEvent === 'read') updateData.readAt = date;

  const errors = status.errors as Array<Record<string, unknown>> || [];
  if (errors.length > 0) {
    updateData.errorMessage = errors[0].message || errors[0].title || 'Unknown error';
  }

  const existing = await prisma.message.findFirst({
    where: { whatsappMessageId: msgId, organizationId: account.organizationId },
  });

  if (existing) {
    await prisma.message.update({
      where: { id: existing.id },
      data: updateData,
    });

    dispatchWebhook(account.organizationId, `message.${statusEvent}`, {
      messageId: existing.id,
      contactId: existing.contactId,
      status: statusEvent,
      timestamp: date.toISOString(),
    }).catch(() => {});

    broadcast(account.organizationId, {
      type: 'STATUS_UPDATE',
      payload: {
        message_id: existing.id,
        contact_id: existing.contactId,
        status: statusEvent,
        timestamp: date.toISOString(),
      },
    });
  }

  const recipient = await prisma.bulkMessageRecipient.findFirst({
    where: { whatsappMessageId: msgId },
  });

  if (recipient) {
    await prisma.bulkMessageRecipient.update({
      where: { id: recipient.id },
      data: updateData,
    });

    const columnMap: Record<string, string> = {
      sent: 'sentCount',
      delivered: 'deliveredCount',
      read: 'readCount',
      failed: 'failedCount',
    };
    const column = columnMap[statusEvent];
    if (column) {
      await prisma.bulkMessageCampaign.update({
        where: { id: recipient.campaignId },
        data: { [column]: { increment: 1 } },
      });
    }
  }
}

async function handleTemplateStatusUpdate(
  account: { organizationId: string },
  update: Record<string, unknown>,
): Promise<void> {
  const templateId = update.template_id as string;
  const event = update.event as string;

  const statusMap: Record<string, string> = {
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    PENDING: 'PENDING',
    FLAGGED: 'REJECTED',
  };

  const dbStatus = statusMap[event] || 'PENDING';

  await prisma.template.updateMany({
    where: { metaTemplateId: templateId, organizationId: account.organizationId },
    data: { status: dbStatus, qualityRating: (update.reason as string) || undefined },
  });

  broadcast(account.organizationId, {
    type: 'TEMPLATE_STATUS_UPDATE',
    payload: {
      templateId,
      status: dbStatus,
      reason: update.reason as string,
    },
  });
}

function broadcast(orgId: string, event: { type: string; payload: unknown }): void {
  try {
    const hub = new Hub();
    hub.broadcastToOrg(orgId, event);
  } catch {
    // WebSocket not available
  }
}

function mapMsgType(type: string): string {
  const map: Record<string, string> = {
    text: 'text',
    image: 'image',
    video: 'video',
    audio: 'audio',
    document: 'document',
    interactive: 'interactive',
    order: 'order',
    system: 'system',
    sticker: 'image',
    reaction: 'reaction',
    location: 'location',
    contacts: 'contacts',
  };
  return map[type] || 'text';
}
