import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuthAndPermission } from '@repo/auth';
import type { AuthContext } from '@repo/auth';

export const GET = withAuthAndPermission('analytics:agents')(async (
  request: NextRequest,
  context: AuthContext
) => {
  const orgId = context.tenantId;
  const { searchParams } = new URL(request.url);
  const startParam = searchParams.get('start');
  const endParam = searchParams.get('end');
  const agentIdsParam = searchParams.get('agent_ids');

  const now = new Date();
  const end = endParam ? new Date(endParam) : now;
  const start = startParam ? new Date(startParam) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

  const agentIds = agentIdsParam ? agentIdsParam.split(',').filter(Boolean) : undefined;

  const agentWhere = agentIds
    ? { id: { in: agentIds }, organizationId: orgId, isActive: true }
    : { organizationId: orgId, isActive: true };

  const agents = await prisma.user.findMany({
    where: agentWhere,
    select: { id: true, fullName: true },
  });

  const agentStats = await Promise.all(
    agents.map(async (agent) => {
      const [handled, avgRes, avgQueue, slaBreached, escalated, breakLogs, dailyGroups] = await Promise.all([
        prisma.agentTransfer.count({
          where: {
            organizationId: orgId,
            agentId: agent.id,
            transferredAt: { gte: start, lte: end },
            status: { in: ['completed', 'resumed'] },
          },
        }),
        prisma.agentTransfer.aggregate({
          where: {
            organizationId: orgId,
            agentId: agent.id,
            transferredAt: { gte: start, lte: end },
            resolutionTimeMins: { gt: 0 },
          },
          _avg: { resolutionTimeMins: true },
        }),
        prisma.agentTransfer.aggregate({
          where: {
            organizationId: orgId,
            agentId: agent.id,
            transferredAt: { gte: start, lte: end },
            queueTimeMins: { gt: 0 },
          },
          _avg: { queueTimeMins: true },
        }),
        prisma.agentTransfer.count({
          where: {
            organizationId: orgId,
            agentId: agent.id,
            transferredAt: { gte: start, lte: end },
            slaBreached: true,
          },
        }),
        prisma.agentTransfer.count({
          where: {
            organizationId: orgId,
            agentId: agent.id,
            transferredAt: { gte: start, lte: end },
            escalationLevel: { gt: 0 },
          },
        }),
        prisma.userAvailabilityLog.findMany({
          where: {
            organizationId: orgId,
            userId: agent.id,
            action: 'break',
            startedAt: { gte: start, lte: end },
          },
          select: { startedAt: true, endedAt: true },
        }),
        prisma.agentTransfer.groupBy({
          by: ['transferredAt'],
          where: {
            organizationId: orgId,
            agentId: agent.id,
            transferredAt: { gte: start, lte: end },
          },
          _count: { id: true },
          orderBy: { transferredAt: 'desc' },
          take: 1,
        }) as any,
      ]);

      let breakTimeMins = 0;
      for (const log of breakLogs) {
        if (!log.endedAt) continue;
        breakTimeMins += (log.endedAt.getTime() - log.startedAt.getTime()) / 60000;
      }

      return {
        agentId: agent.id,
        agentName: agent.fullName,
        transfersHandled: handled,
        avgResolutionTimeMins: Math.round((avgRes._avg.resolutionTimeMins ?? 0) * 100) / 100,
        avgQueueTimeMins: Math.round((avgQueue._avg.queueTimeMins ?? 0) * 100) / 100,
        slaBreachedCount: slaBreached,
        escalationCount: escalated,
        breakTimeMins: Math.round(breakTimeMins),
        busiestDay: dailyGroups.length > 0
          ? new Date(dailyGroups[0].transferredAt).toISOString().slice(0, 10)
          : null,
      };
    })
  );

  return NextResponse.json({
    period: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
    agents: agentStats,
  });
});


