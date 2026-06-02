import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuthAndPermission } from '@repo/auth';
import { enqueueRecipientJobs } from '@repo/queue';
import type { AuthContext } from '@repo/auth';
import { logAudit } from '@repo/audit';

export const POST = withAuthAndPermission('campaigns:send')(async (
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

  if (!['completed', 'paused', 'failed'].includes(campaign.status)) {
    return NextResponse.json({ error: 'Can only retry failed messages on completed, paused, or failed campaigns' }, { status: 400 });
  }

  const failedRecipients = await prisma.bulkMessageRecipient.findMany({
    where: { campaignId: params.id, status: 'failed' },
  });

  if (failedRecipients.length === 0) {
    return NextResponse.json({ error: 'No failed messages to retry' }, { status: 400 });
  }

  await prisma.bulkMessageRecipient.updateMany({
    where: { campaignId: params.id, status: 'failed' },
    data: { status: 'pending', errorMessage: null },
  });

  await prisma.message.updateMany({
    where: {
      campaignRecipients: { some: { campaignId: params.id } },
      status: 'failed',
    },
    data: { status: 'pending', errorMessage: null },
  });

  await prisma.bulkMessageCampaign.update({
    where: { id: params.id },
    data: { status: 'processing' },
  });

  const now = new Date();
  const jobs = failedRecipients.map((recipient) => ({
    campaignId: params.id,
    recipientId: recipient.id,
    organizationId: context.tenantId,
    phoneNumber: recipient.phoneNumber,
    recipientName: recipient.recipientName || '',
    templateParams: recipient.templateParams as Record<string, unknown>,
    headerParams: recipient.headerParams as Record<string, unknown>,
    enqueuedAt: now,
  }));

  await enqueueRecipientJobs(jobs);

  await logAudit(
    context.userId,
    context.email,
    'campaign',
    campaign.id,
    'updated',
    [{ field: 'retry_count', newValue: failedRecipients.length }],
    context.tenantId,
  );

  return NextResponse.json({
    message: 'Retrying failed messages',
    retryCount: failedRecipients.length,
    status: 'processing',
  });
});
