import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuthAndPermission } from '@repo/auth';
import { dispatchWebhook } from '@repo/webhooks';
import type { AuthContext } from '@repo/auth';
import { logAudit } from '@repo/audit';

export const POST = withAuthAndPermission('campaigns:delete')(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } },
) => {
  const campaign = await prisma.bulkMessageCampaign.findFirst({
    where: { id: params.id, organizationId: context.tenantId },
  });

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  if (campaign.status === 'completed' || campaign.status === 'cancelled') {
    return NextResponse.json({ error: 'Campaign already finished' }, { status: 400 });
  }

  await prisma.bulkMessageCampaign.update({
    where: { id: params.id },
    data: { status: 'cancelled' },
  });

  await logAudit(
    context.userId,
    context.email,
    'campaign',
    campaign.id,
    'updated',
    [{ field: 'status', oldValue: campaign.status, newValue: 'cancelled' }],
    context.tenantId,
  );

  dispatchWebhook(context.tenantId, 'campaign.cancelled', {
    campaignId: campaign.id,
    name: campaign.name,
    sentCount: campaign.sentCount,
    failedCount: campaign.failedCount,
  }).catch(() => {});

  return NextResponse.json({ message: 'Campaign cancelled', status: 'cancelled' });
});
