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
  const transfer = await prisma.callTransfer.findFirst({
    where: {
      id: params.id,
      organizationId: context.tenantId,
    },
  });

  if (!transfer) {
    return NextResponse.json({ error: 'Call transfer not found' }, { status: 404 });
  }

  await prisma.callTransfer.update({
    where: { id: params.id },
    data: {
      status: 'completed',
      completedAt: new Date(),
    },
  });

  await prisma.callLog.update({
    where: { id: transfer.callLogId },
    data: { disconnectedBy: 'agent' },
  });

  const wsHub = getWebSocketHub();
  wsHub?.broadcastToOrg(context.tenantId, {
    type: 'call_transfer_completed',
    payload: {
      transfer_id: transfer.id,
      call_log_id: transfer.callLogId,
      status: 'completed',
    },
  });

  return NextResponse.json({ status: 'completed' });
});
