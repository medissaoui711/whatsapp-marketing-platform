import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuthAndPermission } from '@repo/auth';
import type { AuthContext } from '@repo/auth';

export const GET = withAuthAndPermission('transfers:read')(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } }
) => {
  const transfer = await prisma.agentTransfer.findFirst({
    where: { id: params.id, organizationId: context.tenantId },
    include: {
      contact: { select: { profileName: true, phoneNumber: true } },
      agent: { select: { id: true, fullName: true } },
      team: { select: { id: true, name: true } },
      transferredBy: { select: { id: true, fullName: true } },
      resumedBy: { select: { id: true, fullName: true } },
    },
  });

  if (!transfer) {
    return NextResponse.json({ error: 'التحويل غير موجود' }, { status: 404 });
  }

  return NextResponse.json({
    id: transfer.id,
    contactId: transfer.contactId,
    contactName: transfer.contact?.profileName || '',
    phoneNumber: transfer.contactPhone,
    whatsappAccount: transfer.whatsappAccount,
    status: transfer.status,
    source: transfer.source,
    agentId: transfer.agentId,
    agentName: transfer.agent?.fullName,
    teamId: transfer.teamId,
    teamName: transfer.team?.name,
    transferredBy: transfer.transferredByUserId,
    transferredByName: transfer.transferredBy?.fullName,
    notes: transfer.notes,
    transferredAt: transfer.transferredAt.toISOString(),
    resumedAt: transfer.resumedAt?.toISOString(),
    resumedBy: transfer.resumedById,
    resumedByName: transfer.resumedBy?.fullName,
    slaResponseDeadline: transfer.slaResponseDeadline?.toISOString(),
    slaResolutionDeadline: transfer.slaResolutionDeadline?.toISOString(),
    slaBreached: transfer.slaBreached,
    escalationLevel: transfer.escalationLevel,
    escalatedAt: transfer.escalatedAt?.toISOString(),
    pickedUpAt: transfer.pickedUpAt?.toISOString(),
    expiresAt: transfer.expiresAt?.toISOString(),
  });
});
