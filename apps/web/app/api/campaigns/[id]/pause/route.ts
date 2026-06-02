import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuthAndPermission } from '@repo/auth';
import { dispatchWebhook } from '@repo/webhooks';
import type { AuthContext } from '@repo/auth';
import { logAudit } from '@repo/audit';

export const POST = withAuthAndPermission('campaigns:update')(async (
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

  if (!['processing', 'queued'].includes(campaign.status)) {
    return NextResponse.json({ error: 'Campaign is not running' }, { status: 400 });
  }

  await prisma.bulkMessageCampaign.update({
    where: { id: params.id },
    data: { status: 'paused' },
  });

  await logAudit(
    context.userId,
    context.email,
    'campaign',
    campaign.id,
    'updated',
    [{ field: 'status', oldValue: campaign.status, newValue: 'paused' }],
    context.tenantId,
  );

  dispatchWebhook(context.tenantId, 'campaign.paused', {
    campaignId: campaign.id,
    name: campaign.name,
    sentCount: campaign.sentCount,
    failedCount: campaign.failedCount,
  }).catch(() => {});

  return NextResponse.json({ message: 'Campaign paused', status: 'paused' });
});
