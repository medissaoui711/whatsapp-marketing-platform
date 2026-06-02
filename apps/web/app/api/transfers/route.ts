import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { createTransferSchema } from '@repo/shared';
import { withAuthAndPermission, rateLimit } from '@repo/auth';
import type { AuthContext } from '@repo/auth';

export const GET = withAuthAndPermission('transfers:read')(async (
  request: NextRequest,
  context: AuthContext
) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const teamIdParam = searchParams.get('team_id');
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 100);
  const offset = parseInt(searchParams.get('offset') || '0');
  const include = searchParams.get('include') || 'all';

  const hasFullAccess = context.role === 'owner' || context.role === 'admin';
  const includeAll = include === 'all';
  const includeSet = new Set(include.split(','));

  const where: Record<string, unknown> = { organizationId: context.tenantId };

  if (status) where.status = status;

  if (teamIdParam === 'general') {
    where.teamId = null;
  } else if (teamIdParam) {
    where.teamId = teamIdParam;
  }

  if (!hasFullAccess) {
    const memberships = await prisma.teamMember.findMany({
      where: { userId: context.userId },
      select: { teamId: true },
    });
    const userTeamIds = memberships.map(m => m.teamId);

    const accessFilter: Record<string, unknown>[] = [
      { agentId: context.userId },
    ];

    if (userTeamIds.length > 0) {
      accessFilter.push({
        agentId: null,
        OR: [{ teamId: null }, { teamId: { in: userTeamIds } }],
      });
    } else {
      accessFilter.push({ agentId: null, teamId: null });
    }

    where.OR = accessFilter;
  }

  const [totalCount, transfers] = await Promise.all([
    prisma.agentTransfer.count({ where }),
    prisma.agentTransfer.findMany({
      where,
      orderBy: { transferredAt: 'asc' },
      skip: offset,
      take: limit,
      include: {
        contact: includeAll || includeSet.has('contact') ? { select: { profileName: true, phoneNumber: true } } : false,
        agent: includeAll || includeSet.has('agent') ? { select: { id: true, fullName: true, email: true } } : false,
        team: includeAll || includeSet.has('team') ? { select: { id: true, name: true } } : false,
        transferredBy: includeAll || includeSet.has('transferredBy') ? { select: { id: true, fullName: true, email: true } } : false,
        resumedBy: includeAll || includeSet.has('resumedBy') ? { select: { id: true, fullName: true, email: true } } : false,
      },
    }),
  ]);

  const [generalQueueCount, teamCountsRaw] = await Promise.all([
    prisma.agentTransfer.count({
      where: { organizationId: context.tenantId, status: 'active', agentId: null, teamId: null },
    }),
    prisma.agentTransfer.groupBy({
      by: ['teamId'],
      where: {
        organizationId: context.tenantId,
        status: 'active',
        agentId: null,
        teamId: { not: null },
      },
      _count: { teamId: true },
    }),
  ]);

  const teamQueueCounts: Record<string, number> = {};
  for (const tc of teamCountsRaw) {
    if (tc.teamId) teamQueueCounts[tc.teamId] = tc._count.teamId;
  }

  const response = transfers.map(t => ({
    id: t.id,
    contactId: t.contactId,
    contactName: (t.contact as any)?.profileName || '',
    phoneNumber: t.contactPhone,
    whatsappAccount: t.whatsappAccount,
    status: t.status,
    source: t.source,
    agentId: t.agentId,
    agentName: (t.agent as any)?.fullName,
    teamId: t.teamId,
    teamName: (t.team as any)?.name,
    transferredBy: t.transferredByUserId,
    transferredByName: (t.transferredBy as any)?.fullName,
    notes: t.notes,
    transferredAt: t.transferredAt.toISOString(),
    resumedAt: t.resumedAt?.toISOString(),
    resumedBy: t.resumedById,
    resumedByName: (t.resumedBy as any)?.fullName,
    slaResponseDeadline: t.slaResponseDeadline?.toISOString(),
    slaResolutionDeadline: t.slaResolutionDeadline?.toISOString(),
    slaBreached: t.slaBreached,
    escalationLevel: t.escalationLevel,
    escalatedAt: t.escalatedAt?.toISOString(),
    pickedUpAt: t.pickedUpAt?.toISOString(),
    expiresAt: t.expiresAt?.toISOString(),
  }));

  return NextResponse.json({
    transfers: response,
    generalQueueCount,
    teamQueueCounts,
    totalCount,
    limit,
    offset,
  });
});

export const POST = withAuthAndPermission('transfers:create')(async (
  request: NextRequest,
  context: AuthContext
) => {
  const rateResult = await rateLimit(`transfer_create_${context.userId}`, 30, 60 * 1000);
  if (!rateResult.success) {
    return NextResponse.json({
      error: 'طلبات كثيرة جداً',
      retryAfter: Math.ceil((rateResult.resetAt - Date.now()) / 1000),
    }, { status: 429 });
  }

  const body = await request.json();
  const validation = createTransferSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({
      error: 'فشل التحقق من صحة البيانات',
      details: validation.error.issues.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    }, { status: 400 });
  }

  const data = validation.data;

  const contact = await prisma.contact.findFirst({
    where: { id: data.contactId, organizationId: context.tenantId },
  });

  if (!contact) {
    return NextResponse.json({ error: 'جهة الاتصال غير موجودة' }, { status: 404 });
  }

  const existingTransfer = await prisma.agentTransfer.findFirst({
    where: { organizationId: context.tenantId, contactId: data.contactId, status: 'active' },
  });

  if (existingTransfer) {
    return NextResponse.json({ error: 'جهة الاتصال لديها تحويل نشط بالفعل' }, { status: 409 });
  }

  let agentId: string | null = null;
  if (data.agentId) {
    const agent = await prisma.user.findFirst({
      where: { id: data.agentId, organizationId: context.tenantId, isActive: true },
    });
    if (!agent) return NextResponse.json({ error: 'الوكيل غير موجود' }, { status: 404 });
    if (!agent.isAvailable) return NextResponse.json({ error: 'الوكيل غير متاح حالياً' }, { status: 400 });
    agentId = data.agentId;
  }

  let teamId: string | null = null;
  if (data.teamId) {
    const team = await prisma.team.findFirst({
      where: { id: data.teamId, organizationId: context.tenantId, isActive: true },
    });
    if (!team) return NextResponse.json({ error: 'الفريق غير موجود أو غير نشط' }, { status: 404 });
    teamId = data.teamId;
  }

  const transfer = await prisma.agentTransfer.create({
    data: {
      organizationId: context.tenantId,
      contactId: data.contactId,
      whatsappAccount: data.whatsappAccount,
      contactPhone: contact.phoneNumber,
      status: 'active',
      source: data.source,
      agentId,
      teamId,
      transferredByUserId: context.userId,
      notes: data.notes || '',
      transferredAt: new Date(),
    },
    include: {
      agent: { select: { id: true, fullName: true } },
      team: { select: { id: true, name: true } },
      transferredBy: { select: { id: true, fullName: true } },
    },
  });

  await prisma.chatbotSession.updateMany({
    where: { organizationId: context.tenantId, contactId: data.contactId, status: 'active' },
    data: { status: 'cancelled', completedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: context.tenantId,
      resourceType: 'agentTransfer',
      resourceId: transfer.id,
      userId: context.userId,
      userName: context.email,
      action: 'created',
      changes: JSON.stringify([{ field: 'source', newValue: data.source }, { field: 'contactId', newValue: data.contactId }]),
    },
  });

  return NextResponse.json({
    transfer: {
      id: transfer.id,
      contactId: transfer.contactId,
      contactName: contact.profileName || '',
      phoneNumber: transfer.contactPhone,
      whatsappAccount: transfer.whatsappAccount,
      status: transfer.status,
      source: transfer.source,
      agentId: transfer.agentId,
      agentName: (transfer.agent as any)?.fullName,
      teamId: transfer.teamId,
      teamName: (transfer.team as any)?.name,
      transferredBy: transfer.transferredByUserId,
      transferredByName: (transfer.transferredBy as any)?.fullName,
      notes: transfer.notes,
      transferredAt: transfer.transferredAt.toISOString(),
      slaBreached: false,
      escalationLevel: 0,
    },
    message: 'تم إنشاء التحويل بنجاح',
  }, { status: 201 });
});


