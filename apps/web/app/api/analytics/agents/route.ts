import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuthAndPermission } from '@repo/auth';
import type { AuthContext } from '@repo/auth';

const TREND_DAYS = 30;

export const GET = withAuthAndPermission('analytics:agents')(async (
  request: NextRequest,
  context: AuthContext
) => {
  const orgId = context.tenantId;
  const isAdmin = context.role === 'owner' || context.role === 'admin';
  const targetUserId = isAdmin ? undefined : context.userId;

  const now = new Date();
  const trendStart = new Date(now.getTime() - TREND_DAYS * 24 * 60 * 60 * 1000);

  const whereAgentFilter = targetUserId
    ? { id: targetUserId, organizationId: orgId, isActive: true }
    : { organizationId: orgId, isActive: true };

  const [agents, totalTransfersHandled, activeTransfers, avgResolutionResult, avgQueueResult, breakLogs, dailyTransfers] = await Promise.all([
    prisma.user.findMany({
      where: whereAgentFilter,
      select: { id: true, fullName: true, email: true, isAvailable: true },
    }),
    prisma.agentTransfer.count({
      where: {
        organizationId: orgId,
        status: { in: ['completed', 'resumed'] },
        ...(targetUserId ? { agentId: targetUserId } : {}),
      },
    }),
    prisma.agentTransfer.count({
      where: {
        organizationId: orgId,
        status: 'active',
        ...(targetUserId ? { agentId: targetUserId } : {}),
      },
    }),
    prisma.agentTransfer.aggregate({
      where: {
        organizationId: orgId,
        resolutionTimeMins: { gt: 0 },
        ...(targetUserId ? { agentId: targetUserId } : {}),
      },
      _avg: { resolutionTimeMins: true },
    }),
    prisma.agentTransfer.aggregate({
      where: {
        organizationId: orgId,
        queueTimeMins: { gt: 0 },
        ...(targetUserId ? { agentId: targetUserId } : {}),
      },
      _avg: { queueTimeMins: true },
    }),
    prisma.userAvailabilityLog.findMany({
      where: {
        organizationId: orgId,
        action: 'break',
        ...(targetUserId ? { userId: targetUserId } : {}),
        startedAt: { gte: trendStart },
      },
      select: { userId: true, startedAt: true, endedAt: true },
    }),
    prisma.agentTransfer.groupBy({
      by: ['transferredAt'],
      where: {
        organizationId: orgId,
        transferredAt: { gte: trendStart },
        ...(targetUserId ? { agentId: targetUserId } : {}),
      },
      _count: { id: true },
    }) as any,
  ]);

  const userAgentIds = new Set(agents.map(a => a.id));

  const totalOnBreak = agents.filter(a => !a.isAvailable).length;
  const availableAgents = agents.filter(a => a.isAvailable).length;
  const avgResolutionTimeMins = avgResolutionResult._avg.resolutionTimeMins ?? 0;
  const avgQueueTimeMins = avgQueueResult._avg.queueTimeMins ?? 0;

  const breakTimeByUser: Record<string, number> = {};
  for (const log of breakLogs) {
    if (!log.endedAt) continue;
    const durationMins = (log.endedAt.getTime() - log.startedAt.getTime()) / 60000;
    breakTimeByUser[log.userId] = (breakTimeByUser[log.userId] ?? 0) + durationMins;
  }

  const userWhere = targetUserId ? { organizationId: orgId, id: targetUserId, isActive: true } : { organizationId: orgId, isActive: true };

  const agentStats = await Promise.all(
    agents.map(async (agent) => {
      const [handled, active, avgRes, avgQueue, todayCount] = await Promise.all([
        prisma.agentTransfer.count({
          where: { organizationId: orgId, agentId: agent.id, status: { in: ['completed', 'resumed'] } },
        }),
        prisma.agentTransfer.count({
          where: { organizationId: orgId, agentId: agent.id, status: 'active' },
        }),
        prisma.agentTransfer.aggregate({
          where: { organizationId: orgId, agentId: agent.id, resolutionTimeMins: { gt: 0 } },
          _avg: { resolutionTimeMins: true },
        }),
        prisma.agentTransfer.aggregate({
          where: { organizationId: orgId, agentId: agent.id, queueTimeMins: { gt: 0 } },
          _avg: { queueTimeMins: true },
        }),
        prisma.agentTransfer.count({
          where: {
            organizationId: orgId,
            agentId: agent.id,
            transferredAt: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
          },
        }),
      ]);

      return {
        agentId: agent.id,
        agentName: agent.fullName,
        email: agent.email,
        isAvailable: agent.isAvailable,
        totalTransfersHandled: handled,
        activeTransfers: active,
        avgResolutionTimeMins: avgRes._avg.resolutionTimeMins ?? 0,
        avgQueueTimeMins: avgQueue._avg.queueTimeMins ?? 0,
        transfersToday: todayCount,
        breakTimeMins: Math.round(breakTimeByUser[agent.id] ?? 0),
      };
    })
  );

  const dateMap: Record<string, number> = {};
  for (let i = 0; i < TREND_DAYS; i++) {
    const d = new Date(trendStart.getTime() + i * 24 * 60 * 60 * 1000);
    dateMap[d.toISOString().slice(0, 10)] = 0;
  }
  for (const row of dailyTransfers) {
    const key = new Date(row.transferredAt).toISOString().slice(0, 10);
    if (dateMap[key] !== undefined) dateMap[key] += row._count.id;
  }

  const transfersOverTime = Object.entries(dateMap).map(([date, value]) => ({ date, value }));

  const resByDayRecords = await prisma.agentTransfer.findMany({
    where: {
      organizationId: orgId,
      transferredAt: { gte: trendStart },
      resolutionTimeMins: { gt: 0 },
      ...(targetUserId ? { agentId: targetUserId } : {}),
    },
    select: { transferredAt: true, resolutionTimeMins: true },
  });

  const resByDay: Record<string, { sum: number; count: number }> = {};
  for (const r of resByDayRecords) {
    const key = r.transferredAt.toISOString().slice(0, 10);
    if (!resByDay[key]) resByDay[key] = { sum: 0, count: 0 };
    resByDay[key].sum += r.resolutionTimeMins;
    resByDay[key].count += 1;
  }

  const resolutionTimeOverTime = transfersOverTime.map(({ date }) => ({
    date,
    value: resByDay[date] ? Math.round((resByDay[date].sum / resByDay[date].count) * 100) / 100 : 0,
  }));

  const qByDayRecords = await prisma.agentTransfer.findMany({
    where: {
      organizationId: orgId,
      transferredAt: { gte: trendStart },
      queueTimeMins: { gt: 0 },
      ...(targetUserId ? { agentId: targetUserId } : {}),
    },
    select: { transferredAt: true, queueTimeMins: true },
  });

  const qByDay: Record<string, { sum: number; count: number }> = {};
  for (const r of qByDayRecords) {
    const key = r.transferredAt.toISOString().slice(0, 10);
    if (!qByDay[key]) qByDay[key] = { sum: 0, count: 0 };
    qByDay[key].sum += r.queueTimeMins;
    qByDay[key].count += 1;
  }

  const queueTimeOverTime = transfersOverTime.map(({ date }) => ({
    date,
    value: qByDay[date] ? Math.round((qByDay[date].sum / qByDay[date].count) * 100) / 100 : 0,
  }));

  return NextResponse.json({
    summary: {
      totalAgents: agents.length,
      availableAgents,
      onBreakAgents: totalOnBreak,
      totalTransfersHandled,
      avgResolutionTimeMins: Math.round(avgResolutionTimeMins * 100) / 100,
      avgQueueTimeMins: Math.round(avgQueueTimeMins * 100) / 100,
      activeTransfers,
    },
    agents: agentStats,
    trends: {
      transfersOverTime,
      resolutionTimeOverTime,
      queueTimeOverTime,
    },
  });
});


