import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { getWhatsAppAccountCached } from '@repo/cache';
import { getWebSocketHub } from '@/lib/websocket';
import { MessageType } from '@repo/websocket';
import type { CallPermissionReplyData } from '@repo/shared';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone_number_id, from, reply } = body;

    if (!phone_number_id || !from || !reply) {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    const account = await getWhatsAppAccountCached(phone_number_id);
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const contact = await prisma.contact.findFirst({
      where: {
        organizationId: account.organizationId,
        phoneNumber: from,
      },
    });

    if (!contact) {
      return NextResponse.json({ success: true });
    }

    const permission = await prisma.callPermission.findFirst({
      where: {
        organizationId: account.organizationId,
        contactId: contact.id,
        status: 'pending',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!permission) {
      return NextResponse.json({ success: true });
    }

    const now = new Date();
    const replyData = reply as CallPermissionReplyData;
    const updates: any = {
      respondedAt: now,
    };

    if (replyData.response === 'accept') {
      updates.status = 'accepted';
      if (replyData.expirationTimestamp && replyData.expirationTimestamp > 0) {
        updates.expiresAt = new Date(replyData.expirationTimestamp * 1000);
      }
    } else {
      updates.status = 'declined';
    }

    await prisma.callPermission.update({
      where: { id: permission.id },
      data: updates,
    });

    const wsHub = getWebSocketHub();
    const wsPayload: any = {
      contact_id: contact.id,
      contact_phone: contact.phoneNumber,
      contact_name: contact.profileName,
      status: updates.status,
    };
    if (updates.expiresAt) {
      wsPayload.expires_at = updates.expiresAt.toISOString();
    }

    wsHub?.broadcastToOrg(account.organizationId, {
      type: MessageType.CALL_PERMISSION_UPDATE,
      payload: wsPayload,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Call permission webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


