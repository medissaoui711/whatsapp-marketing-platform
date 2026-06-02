import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuthAndPermission } from '@repo/auth';
import type { AuthContext } from '@repo/auth';

export const DELETE = withAuthAndPermission('campaigns:update')(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string; recipientId: string } },
) => {
  const campaign = await prisma.bulkMessageCampaign.findFirst({
    where: { id: params.id, organizationId: context.tenantId },
  });

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  if (campaign.status !== 'draft') {
    return NextResponse.json({ error: 'Can only delete recipients from draft campaigns' }, { status: 400 });
  }

  const recipient = await prisma.bulkMessageRecipient.findFirst({
    where: { id: params.recipientId, campaignId: params.id },
  });

  if (!recipient) {
    return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
  }

  await prisma.bulkMessageRecipient.delete({
    where: { id: params.recipientId },
  });

  const totalCount = await prisma.bulkMessageRecipient.count({
    where: { campaignId: params.id },
  });

  await prisma.bulkMessageCampaign.update({
    where: { id: params.id },
    data: { totalRecipients: totalCount },
  });

  return NextResponse.json({ message: 'Recipient deleted successfully' });
});
