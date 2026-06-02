import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { getCache, getWhatsAppAccountCached } from '@repo/cache';
import { getWebSocketHub } from '@/lib/websocket';
import { contactutil } from '@/lib/contact-util';
import { MessageType } from '@repo/websocket';
import type { CallEvent, CallStatus } from '@repo/shared';

function stickyCallKey(orgId: string, phone: string): string {
  return `vc_sticky:${orgId}:${phone}`;
}

async function getOrCreateCallLog(
  account: any,
  contact: any,
  callId: string,
  callerPhone: string,
  now: Date,
) {
  let callLog = await prisma.callLog.findFirst({
    where: {
      whatsappCallId: callId,
      organizationId: account.organizationId,
    },
  });

  if (callLog) return callLog;

  let ivrFlowId: string | undefined;
  const ivrFlow = await prisma.iVRFlow.findFirst({
    where: {
      organizationId: account.organizationId,
      whatsappAccount: account.name,
      isCallStart: true,
      isActive: true,
    },
  });
  if (ivrFlow) ivrFlowId = ivrFlow.id;

  callLog = await prisma.callLog.create({
    data: {
      organizationId: account.organizationId,
      whatsappAccount: account.name,
      contactId: contact.id,
      whatsappCallId: callId,
      callerPhone,
      status: 'ringing',
      direction: 'incoming',
      startedAt: now,
      ivrFlowId,
    },
  });

  return callLog;
}

async function validateStickyAgent(
  agentId: string,
  orgId: string,
  wsHub: any,
): Promise<string | null> {
  const agent = await prisma.user.findFirst({
    where: {
      id: agentId,
      organizationId: orgId,
      isActive: true,
      isAvailable: true,
    },
  });

  if (!agent) return null;
  if (!wsHub || !wsHub.isUserOnline(orgId, agentId)) return null;

  return agentId;
}

async function resolveStickyAgent(
  rawPayload: string | undefined,
  orgId: string,
  callerPhone: string,
  wsHub: any,
): Promise<string | null> {
  if (rawPayload?.startsWith('agent:')) {
    const agentId = rawPayload.slice(6);
    const validated = await validateStickyAgent(agentId, orgId, wsHub);
    if (validated) return validated;
  }

  const cache = getCache();
  const stickyKey = stickyCallKey(orgId, callerPhone);
  const cachedAgentId = await cache.get<string>(stickyKey);

  if (cachedAgentId) {
    const validated = await validateStickyAgent(cachedAgentId, orgId, wsHub);
    if (validated) {
      await cache.del(stickyKey);
      return validated;
    }
  }

  return null;
}

function broadcastCallEvent(wsHub: any, orgId: string, eventType: string, payload: any) {
  if (!wsHub) return;
  wsHub.broadcastToOrg(orgId, { type: eventType, payload });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone_number_id, call } = body;

    if (!phone_number_id || !call) {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    const account = await getWhatsAppAccountCached(phone_number_id);
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const ce = call as CallEvent;
    const now = new Date();
    const wsHub = getWebSocketHub();

    if (!ce.from) {
      return NextResponse.json({ success: true });
    }

    const contact = await contactutil.getOrCreateContact(
      account.organizationId,
      ce.from,
      '',
    );

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 500 });
    }

    const callLog = await getOrCreateCallLog(account, contact, ce.id, ce.from, now);
    if (!callLog) {
      return NextResponse.json({ error: 'Failed to create call log' }, { status: 500 });
    }

    switch (ce.event) {
      case 'ringing': {
        const payload: any = {
          call_log_id: callLog.id,
          call_id: ce.id,
          caller_phone: ce.from,
          contact_id: contact.id,
          contact_name: contact.profileName,
          ivr_flow_id: callLog.ivrFlowId,
          started_at: now.toISOString(),
        };

        const stickyAgentId = await resolveStickyAgent(
          ce.bizOpaqueCallbackData,
          account.organizationId,
          contact.phoneNumber,
          wsHub,
        );

        if (stickyAgentId) {
          payload.sticky_agent_id = stickyAgentId;
          wsHub?.broadcastToUser(account.organizationId, stickyAgentId, {
            type: MessageType.CALL_INCOMING,
            payload,
          });
        } else {
          broadcastCallEvent(wsHub, account.organizationId, MessageType.CALL_INCOMING, payload);
        }
        break;
      }

      case 'connect': {
        await prisma.callLog.update({
          where: { id: callLog.id },
          data: {
            status: 'answered',
            answeredAt: now,
          },
        });

        broadcastCallEvent(wsHub, account.organizationId, MessageType.CALL_ANSWERED, {
          call_id: ce.id,
          contact_id: contact.id,
          answered_at: now.toISOString(),
        });
        break;
      }

      case 'in_call': {
        await prisma.callLog.update({
          where: { id: callLog.id },
          data: {
            status: 'answered',
            answeredAt: now,
          },
        });

        broadcastCallEvent(wsHub, account.organizationId, MessageType.CALL_ANSWERED, {
          call_id: ce.id,
          contact_id: contact.id,
          answered_at: now.toISOString(),
        });
        break;
      }

      case 'ended':
      case 'terminate': {
        const updatedCallLog = await prisma.callLog.findUnique({
          where: { id: callLog.id },
        });

        let duration = 0;
        if (updatedCallLog?.answeredAt) {
          duration = Math.floor((now.getTime() - new Date(updatedCallLog.answeredAt).getTime()) / 1000);
        }

        let finalStatus: CallStatus = 'completed';
        if (updatedCallLog?.direction === 'incoming' && !updatedCallLog?.agentId && updatedCallLog?.status !== 'transferring') {
          finalStatus = 'missed';
        }

        const updates: any = {
          status: finalStatus,
          endedAt: now,
          duration,
        };
        if (!updatedCallLog?.disconnectedBy) {
          updates.disconnectedBy = 'client';
        }

        await prisma.callLog.update({
          where: { id: callLog.id },
          data: updates,
        });

        broadcastCallEvent(wsHub, account.organizationId, MessageType.CALL_ENDED, {
          call_id: ce.id,
          contact_id: contact.id,
          status: finalStatus,
          duration,
          ended_at: now.toISOString(),
          disconnected_by: updatedCallLog?.disconnectedBy || 'client',
        });
        break;
      }

      case 'missed':
      case 'unanswered': {
        await prisma.callLog.update({
          where: { id: callLog.id },
          data: {
            status: 'missed',
            endedAt: now,
            disconnectedBy: 'client',
          },
        });

        broadcastCallEvent(wsHub, account.organizationId, MessageType.CALL_ENDED, {
          call_id: ce.id,
          contact_id: contact.id,
          status: 'missed',
          ended_at: now.toISOString(),
        });
        break;
      }
    }

    if (ce.error) {
      await prisma.callLog.updateMany({
        where: { whatsappCallId: ce.id, organizationId: account.organizationId },
        data: {
          status: 'failed',
          errorMessage: ce.error.message,
          endedAt: now,
          disconnectedBy: 'system',
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Call webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


