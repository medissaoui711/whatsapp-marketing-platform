import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuthAndPermission } from '@repo/auth';
import { enqueueRecipientJobs } from '@repo/queue';
import { dispatchWebhook } from '@repo/webhooks';
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

  if (!['draft', 'scheduled', 'paused'].includes(campaign.status)) {
    return NextResponse.json({ error: 'Campaign cannot be started in current state' }, { status: 400 });
  }

  const pendingRecipients = await prisma.bulkMessageRecipient.findMany({
    where: { campaignId: params.id, status: 'pending' },
  });

  if (pendingRecipients.length === 0) {
    return NextResponse.json({ error: 'Campaign has no pending recipients' }, { status: 400 });
  }

  const template = await prisma.template.findFirst({
    where: { id: campaign.templateId, organizationId: context.tenantId },
  });

  if (!template) {
    return NextResponse.json({ error: 'Campaign template no longer exists' }, { status: 400 });
  }

  const now = new Date();
  await prisma.bulkMessageCampaign.update({
    where: { id: params.id },
    data: {
      status: 'processing',
      startedAt: now,
    },
  });

  const jobs = pendingRecipients.map((recipient) => ({
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
    [{ field: 'status', oldValue: campaign.status, newValue: 'processing' }],
    context.tenantId,
  );

  dispatchWebhook(context.tenantId, 'campaign.started', {
    campaignId: campaign.id,
    name: campaign.name,
    whatsappAccount: campaign.whatsappAccount,
    recipientCount: pendingRecipients.length,
    templateId: campaign.templateId,
  }).catch(() => {});

  return NextResponse.json({ message: 'Campaign started', status: 'processing' });
});
