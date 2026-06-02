import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuth } from '@repo/auth';
import { availabilitySchema } from '@repo/shared';
import { getWebSocketHub } from '@/lib/websocket';

export const PUT = withAuth(async (request: NextRequest, context) => {
  try {
    const body = await request.json();
    const validation = availabilitySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'بيانات غير صحيحة',
        details: validation.error.issues.map((e: any) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      }, { status: 400 });
    }

    const { isAvailable } = validation.data;

    const user = await prisma.user.findUnique({
      where: { id: context.userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.isAvailable !== isAvailable) {
      const now = new Date();

      await prisma.userAvailabilityLog.updateMany({
        where: { userId: context.userId, endedAt: null },
        data: { endedAt: now },
      });

      await prisma.userAvailabilityLog.create({
        data: {
          userId: context.userId,
          organizationId: context.tenantId,
          action: isAvailable ? 'available' : 'away',
          startedAt: now,
        },
      });
    }

    await prisma.user.update({
      where: { id: context.userId },
      data: { isAvailable },
    });

    let transfersToQueue = 0;
    let breakStartedAt: string | undefined;

    if (!isAvailable) {
      const transfers = await prisma.agentTransfer.findMany({
        where: {
          agentId: context.userId,
          organizationId: context.tenantId,
          status: 'active',
        },
      });

      for (const transfer of transfers) {
        await prisma.agentTransfer.update({
          where: { id: transfer.id },
          data: { agentId: null },
        });
        transfersToQueue++;
      }

      const currentBreak = await prisma.userAvailabilityLog.findFirst({
        where: { userId: context.userId, action: 'away', endedAt: null },
        orderBy: { startedAt: 'desc' },
      });
      if (currentBreak) {
        breakStartedAt = currentBreak.startedAt.toISOString();
      }
    }

    const wsHub = getWebSocketHub();
    if (wsHub) {
      wsHub.broadcastToOrg(context.tenantId, {
        type: 'agent_availability',
        payload: {
          agentId: context.userId,
          isAvailable,
          breakStartedAt,
        },
      });
    }

    return NextResponse.json({
      message: 'Availability updated successfully',
      isAvailable,
      status: isAvailable ? 'available' : 'away',
      breakStartedAt,
      transfersToQueue,
    });
  } catch (error) {
    console.error('Availability update error:', error);
    return NextResponse.json({ error: 'Failed to update availability' }, { status: 500 });
  }
});


