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
  const agentId = request.url.split('/analytics/agents/')[1]?.split('/')[0];
  const isAdmin = context.role === 'owner' || context.role === 'admin';

  if (!agentId) {
    return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
  }

  if (!isAdmin && context.userId !== agentId) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const agent = await prisma.user.findFirst({
    where: { id: agentId, organizationId: orgId, isActive: true },
    select: { id: true, fullName: true, email: true, isAvailable: true },
  });

  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart.getTime() - todayStart.getDay() * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const trendStart = new Date(now.getTime() - TREND_DAYS * 24 * 60 * 60 * 1000);

  const [
    totalHandled,
    activeTransfers,
    avgRes,
    avgQueue,
    todayCount,
    weekCount,
    monthCount,
    slaBreachedCount,
    escalationCount,
    breakLogs,
    recentTransfers,
  ] = await Promise.all([
    prisma.agentTransfer.count({
      where: { organizationId: orgId, agentId, status: { in: ['completed', 'resumed'] } },
    }),
    prisma.agentTransfer.count({
      where: { organizationId: orgId, agentId, status: 'active' },
    }),
    prisma.agentTransfer.aggregate({
      where: { organizationId: orgId, agentId, resolutionTimeMins: { gt: 0 } },
      _avg: { resolutionTimeMins: true },
    }),
    prisma.agentTransfer.aggregate({
      where: { organizationId: orgId, agentId, queueTimeMins: { gt: 0 } },
      _avg: { queueTimeMins: true },
    }),
    prisma.agentTransfer.count({
      where: { organizationId: orgId, agentId, transferredAt: { gte: todayStart } },
    }),
    prisma.agentTransfer.count({
      where: { organizationId: orgId, agentId, transferredAt: { gte: weekStart } },
    }),
    prisma.agentTransfer.count({
      where: { organizationId: orgId, agentId, transferredAt: { gte: monthStart } },
    }),
    prisma.agentTransfer.count({
      where: { organizationId: orgId, agentId, slaBreached: true },
    }),
    prisma.agentTransfer.count({
      where: { organizationId: orgId, agentId, escalationLevel: { gt: 0 } },
    }),
    prisma.userAvailabilityLog.findMany({
      where: { organizationId: orgId, userId: agentId, action: 'break', startedAt: { gte: monthStart } },
      select: { startedAt: true, endedAt: true },
    }),
    prisma.agentTransfer.findMany({
      where: { organizationId: orgId, agentId },
      orderBy: { transferredAt: 'desc' },
      take: 20,
      select: {
        id: true,
        contactId: true,
        contactPhone: true,
        status: true,
        transferredAt: true,
        resumedAt: true,
        resolutionTimeMins: true,
        queueTimeMins: true,
        slaBreached: true,
      },
    }),
  ]);

  const calcBreakMins = (start: Date): number => {
    const logs = breakLogs.filter(l => l.startedAt >= start);
    let total = 0;
    for (const log of logs) {
      if (!log.endedAt) continue;
      total += (log.endedAt.getTime() - log.startedAt.getTime()) / 60000;
    }
    return Math.round(total);
  };

  const trendTransfers = await prisma.agentTransfer.findMany({
    where: { organizationId: orgId, agentId, transferredAt: { gte: trendStart } },
    select: { transferredAt: true, resolutionTimeMins: true },
    orderBy: { transferredAt: 'asc' },
  });

  const dateMap: Record<string, number> = {};
  const resByDay: Record<string, { sum: number; count: number }> = {};
  for (let i = 0; i < TREND_DAYS; i++) {
    const d = new Date(trendStart.getTime() + i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    dateMap[key] = 0;
  }
  for (const t of trendTransfers) {
    const key = t.transferredAt.toISOString().slice(0, 10);
    if (dateMap[key] !== undefined) dateMap[key] += 1;
    if (t.resolutionTimeMins > 0) {
      if (!resByDay[key]) resByDay[key] = { sum: 0, count: 0 };
      resByDay[key].sum += t.resolutionTimeMins;
      resByDay[key].count += 1;
    }
  }

  const transfersOverTime = Object.entries(dateMap).map(([date, value]) => ({ date, value }));
  const resolutionTimeOverTime = transfersOverTime.map(({ date }) => ({
    date,
    value: resByDay[date] ? Math.round((resByDay[date].sum / resByDay[date].count) * 100) / 100 : 0,
  }));

  return NextResponse.json({
    agentId: agent.id,
    agentName: agent.fullName,
    email: agent.email,
    isAvailable: agent.isAvailable,
    performance: {
      totalTransfersHandled: totalHandled,
      activeTransfers,
      avgResolutionTimeMins: Math.round((avgRes._avg.resolutionTimeMins ?? 0) * 100) / 100,
      avgQueueTimeMins: Math.round((avgQueue._avg.queueTimeMins ?? 0) * 100) / 100,
      transfersToday: todayCount,
      transfersThisWeek: weekCount,
      transfersThisMonth: monthCount,
      breakTimeTodayMins: calcBreakMins(todayStart),
      breakTimeThisWeekMins: calcBreakMins(weekStart),
      breakTimeThisMonthMins: calcBreakMins(monthStart),
      slaBreachedCount,
      escalationCount,
    },
    recentTransfers: recentTransfers.map(t => ({
      id: t.id,
      contactId: t.contactId,
      contactPhone: t.contactPhone,
      status: t.status,
      transferredAt: t.transferredAt.toISOString(),
      resolvedAt: t.resumedAt?.toISOString() ?? null,
      resolutionTimeMins: t.resolutionTimeMins,
      queueTimeMins: t.queueTimeMins,
      slaBreached: t.slaBreached,
    })),
    trends: {
      transfersOverTime,
      resolutionTimeOverTime,
    },
  });
});
