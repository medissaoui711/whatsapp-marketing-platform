import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuthAndPermission } from '@repo/auth';
import type { AuthContext } from '@repo/auth';
import { utils } from '@/lib/utils';

export const GET = withAuthAndPermission('call_transfers:read')(async (
  request: NextRequest,
  context: AuthContext,
) => {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
  const status = searchParams.get('status');

  const where: any = { organizationId: context.tenantId };
  if (status) where.status = status;

  const [transfers, total] = await Promise.all([
    prisma.callTransfer.findMany({
      where,
      include: {
        contact: true,
        agent: { select: { id: true, fullName: true, email: true } },
        initiatingAgent: { select: { id: true, fullName: true, email: true } },
        callLog: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.callTransfer.count({ where }),
  ]);

  const shouldMask = await utils.shouldMaskPhoneNumbers(context.tenantId);

  const maskedTransfers = transfers.map((transfer) => ({
    ...transfer,
    callerPhone: shouldMask ? utils.maskPhoneNumber(transfer.callerPhone) : transfer.callerPhone,
    contact: transfer.contact
      ? {
          ...transfer.contact,
          phoneNumber: shouldMask
            ? utils.maskPhoneNumber(transfer.contact.phoneNumber)
            : transfer.contact.phoneNumber,
          profileName: shouldMask
            ? utils.maskIfPhoneNumber(transfer.contact.profileName)
            : transfer.contact.profileName,
        }
      : null,
  }));

  return NextResponse.json({
    callTransfers: maskedTransfers,
    total,
    page,
    limit,
  });
});

export const POST = withAuthAndPermission('call_transfers:create')(async (
  request: NextRequest,
  context: AuthContext,
) => {
  const body = await request.json();
  const { callLogId, teamId, agentId } = body;

  if (!callLogId || !teamId) {
    return NextResponse.json({ error: 'call_log_id and team_id are required' }, { status: 400 });
  }

  const team = await prisma.team.findFirst({
    where: { id: teamId, organizationId: context.tenantId },
  });
  if (!team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  }

  const callLog = await prisma.callLog.findFirst({
    where: { id: callLogId, organizationId: context.tenantId },
  });
  if (!callLog) {
    return NextResponse.json({ error: 'Call log not found' }, { status: 404 });
  }

  let targetAgentId: string | undefined;
  if (agentId) {
    const teamMember = await prisma.teamMember.findFirst({
      where: { teamId, userId: agentId },
    });
    if (!teamMember) {
      return NextResponse.json({ error: 'Agent is not a member of the specified team' }, { status: 400 });
    }
    targetAgentId = agentId;
  }

  const transfer = await prisma.callTransfer.create({
    data: {
      organizationId: context.tenantId,
      callLogId,
      whatsappCallId: callLog.whatsappCallId || '',
      callerPhone: callLog.callerPhone,
      contactId: callLog.contactId,
      whatsappAccount: callLog.whatsappAccount,
      status: 'waiting',
      teamId,
      agentId: targetAgentId,
      initiatingAgentId: context.userId,
      transferredAt: new Date(),
    },
  });

  await prisma.callLog.update({
    where: { id: callLogId },
    data: { status: 'transferring' },
  });

  const wsHub = (await import('@/lib/websocket')).getWebSocketHub();
  wsHub?.broadcastToOrg(context.tenantId, {
    type: 'call_transfer_waiting',
    payload: {
      transfer_id: transfer.id,
      call_log_id: callLogId,
      contact_id: callLog.contactId,
      team_id: teamId,
      agent_id: targetAgentId,
      status: 'waiting',
    },
  });

  return NextResponse.json({ transfer, status: 'transferring' });
});


