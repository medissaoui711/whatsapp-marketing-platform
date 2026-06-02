import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuthAndPermission } from '@repo/auth';
import type { AuthContext } from '@repo/auth';
import { getWebSocketHub } from '@/lib/websocket';

export const POST = withAuthAndPermission('call_transfers:write')(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } },
) => {
  const body = await request.json();
  const { sdp_offer } = body;

  if (!sdp_offer) {
    return NextResponse.json({ error: 'sdp_offer is required' }, { status: 400 });
  }

  const transfer = await prisma.callTransfer.findFirst({
    where: {
      id: params.id,
      organizationId: context.tenantId,
      status: 'waiting',
    },
  });

  if (!transfer) {
    return NextResponse.json({ error: 'Call transfer not found or already accepted' }, { status: 404 });
  }

  if (transfer.agentId && transfer.agentId !== context.userId && !transfer.teamId) {
    return NextResponse.json({ error: 'This transfer is directed to a specific agent' }, { status: 403 });
  }

  if (transfer.teamId) {
    const teamMember = await prisma.teamMember.findFirst({
      where: { teamId: transfer.teamId, userId: context.userId },
    });
    if (!teamMember) {
      return NextResponse.json({ error: 'You are not a member of the target team' }, { status: 403 });
    }
  }

  const result = await prisma.callTransfer.updateMany({
    where: {
      id: params.id,
      status: 'waiting',
    },
    data: {
      status: 'connected',
      agentId: context.userId,
      connectedAt: new Date(),
    },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: 'Transfer was already accepted by another agent' }, { status: 409 });
  }

  await prisma.callLog.update({
    where: { id: transfer.callLogId },
    data: { agentId: context.userId },
  });

  const sdpAnswer = 'v=0\r\no=- 0 0 IN IP4 0.0.0.0\r\ns=-\r\nt=0 0\r\n...';

  const wsHub = getWebSocketHub();
  wsHub?.broadcastToOrg(context.tenantId, {
    type: 'call_transfer_connected',
    payload: {
      transfer_id: transfer.id,
      call_log_id: transfer.callLogId,
      agent_id: context.userId,
      status: 'connected',
    },
  });

  return NextResponse.json({ sdp_answer: sdpAnswer });
});
