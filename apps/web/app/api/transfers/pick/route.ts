import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuthAndPermission } from '@repo/auth';
import type { AuthContext } from '@repo/auth';

export const POST = withAuthAndPermission('transfers:pickup')(async (
  request: NextRequest,
  context: AuthContext
) => {
  const { searchParams } = new URL(request.url);
  const teamIdParam = searchParams.get('team_id');
  const hasFullAccess = context.role === 'owner' || context.role === 'admin';

  const memberships = await prisma.teamMember.findMany({
    where: { userId: context.userId },
    select: { teamId: true },
  });
  const userTeamIds = memberships.map(m => m.teamId);

  const where: Record<string, unknown> = {
    organizationId: context.tenantId,
    status: 'active',
    agentId: null,
  };

  if (teamIdParam === 'general') {
    where.teamId = null;
  } else if (teamIdParam) {
    if (!hasFullAccess && !userTeamIds.includes(teamIdParam)) {
      return NextResponse.json({ error: 'لست عضواً في هذا الفريق' }, { status: 403 });
    }
    where.teamId = teamIdParam;
  } else if (!hasFullAccess) {
    if (userTeamIds.length > 0) {
      where.OR = [{ teamId: null }, { teamId: { in: userTeamIds } }];
    } else {
      where.teamId = null;
    }
  }

  const transfer = await prisma.agentTransfer.findFirst({
    where,
    orderBy: { transferredAt: 'asc' },
    include: { contact: true },
  });

  if (!transfer) {
    return NextResponse.json({ message: 'لا توجد تحويلات في الطابور', transfer: null });
  }

  const now = new Date();
  const updated = await prisma.agentTransfer.update({
    where: { id: transfer.id },
    data: {
      agentId: context.userId,
      pickedUpAt: now,
      transferredByUserId: transfer.transferredByUserId || context.userId,
    },
    include: {
      agent: { select: { id: true, fullName: true } },
      team: { select: { id: true, name: true } },
    },
  });

  const settings = await prisma.chatbotSettings.findFirst({
    where: { organizationId: context.tenantId },
  });

  if (settings?.assignToSameAgent && transfer.contact && !transfer.contact.assignedUserId) {
    await prisma.contact.update({
      where: { id: transfer.contactId },
      data: { assignedUserId: context.userId },
    });
  }

  await prisma.auditLog.create({
    data: {
      organizationId: context.tenantId,
      resourceType: 'agentTransfer',
      resourceId: transfer.id,
      userId: context.userId,
      userName: context.email,
      action: 'updated',
      changes: JSON.stringify([{ field: 'agentId', newValue: context.userId }]),
    },
  });

  return NextResponse.json({
    message: 'تم اختيار التحويل بنجاح',
    transfer: {
      id: updated.id,
      contactId: updated.contactId,
      contactName: transfer.contact?.profileName || '',
      phoneNumber: updated.contactPhone,
      whatsappAccount: updated.whatsappAccount,
      status: updated.status,
      source: updated.source,
      agentId: updated.agentId,
      agentName: (updated.agent as any)?.fullName,
      teamId: updated.teamId,
      teamName: (updated.team as any)?.name,
      transferredBy: updated.transferredByUserId,
      notes: updated.notes,
      transferredAt: updated.transferredAt.toISOString(),
      pickedUpAt: updated.pickedUpAt?.toISOString(),
    },
  });
});


