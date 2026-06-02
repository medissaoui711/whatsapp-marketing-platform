import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@repo/auth';
import { prisma } from '@repo/db';
import { getDashboardStatsCached, setDashboardStatsCache } from '@repo/cache';
import type { AuthContext } from '@repo/auth';
import type { DashboardStatsCache } from '@repo/cache';

const handler = async (request: NextRequest, context: AuthContext) => {
  const orgId = context.tenantId;

  const cached = await getDashboardStatsCached(orgId);
  if (cached) {
    return NextResponse.json(cached);
  }

  const now = new Date();
  const periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const prevPeriodStart = new Date(periodStart.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalMessages,
    prevTotalMessages,
    totalContacts,
    prevTotalContacts,
    totalChatbotSessions,
    prevChatbotSessions,
    totalCampaigns,
    prevTotalCampaigns,
    activeCampaigns,
    messagesSent,
    messagesReceived,
    recentMessages,
  ] = await Promise.all([
    prisma.message.count({ where: { organizationId: orgId, createdAt: { gte: periodStart } } }),
    prisma.message.count({ where: { organizationId: orgId, createdAt: { gte: prevPeriodStart, lt: periodStart } } }),
    prisma.contact.count({ where: { organizationId: orgId, createdAt: { gte: periodStart } } }),
    prisma.contact.count({ where: { organizationId: orgId, createdAt: { gte: prevPeriodStart, lt: periodStart } } }),
    prisma.chatbotSession.count({ where: { organizationId: orgId, startedAt: { gte: periodStart } } }),
    prisma.chatbotSession.count({ where: { organizationId: orgId, startedAt: { gte: prevPeriodStart, lt: periodStart } } }),
    prisma.bulkMessageCampaign.count({ where: { organizationId: orgId, createdAt: { gte: periodStart } } }),
    prisma.bulkMessageCampaign.count({ where: { organizationId: orgId, createdAt: { gte: prevPeriodStart, lt: periodStart } } }),
    prisma.bulkMessageCampaign.count({
      where: { organizationId: orgId, status: { in: ['processing', 'scheduled'] } },
    }),
    prisma.message.count({ where: { organizationId: orgId, direction: 'outgoing', createdAt: { gte: periodStart } } }),
    prisma.message.count({ where: { organizationId: orgId, direction: 'incoming', createdAt: { gte: periodStart } } }),
    prisma.message.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        contactId: true,
        content: true,
        direction: true,
        messageType: true,
        createdAt: true,
        contact: { select: { profileName: true, phoneNumber: true } },
        sentByUser: { select: { fullName: true } },
      },
    }),
  ]);

  const calcChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100 * 100) / 100;
  };

  const stats: DashboardStatsCache = {
    totalMessages,
    totalContacts,
    totalChatbotSessions,
    totalCampaigns,
    activeCampaigns,
    messagesSent,
    messagesReceived,
    messagesChange: calcChange(totalMessages, prevTotalMessages),
    contactsChange: calcChange(totalContacts, prevTotalContacts),
    chatbotSessionsChange: calcChange(totalChatbotSessions, prevChatbotSessions),
    campaignsChange: calcChange(totalCampaigns, prevTotalCampaigns),
    recentMessages: recentMessages.map(m => ({
      id: m.id,
      contactId: m.contactId,
      contactName: m.contact.profileName,
      phoneNumber: m.contact.phoneNumber,
      content: m.content,
      direction: m.direction,
      messageType: m.messageType,
      sentByUserName: m.sentByUser?.fullName ?? null,
      createdAt: m.createdAt.toISOString(),
    })),
  };

  await setDashboardStatsCache(orgId, stats);

  return NextResponse.json(stats);
};

export const GET = withAuth(handler);
