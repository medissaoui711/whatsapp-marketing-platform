import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { importRecipientsSchema } from '@repo/shared';
import { withAuthAndPermission } from '@repo/auth';
import type { AuthContext } from '@repo/auth';
import type { RecipientResponse } from '@repo/shared';
import { utils } from '@/lib/utils';

export const GET = withAuthAndPermission('campaigns:read')(async (
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

  const recipients = await prisma.bulkMessageRecipient.findMany({
    where: { campaignId: params.id },
    orderBy: { createdAt: 'asc' },
  });

  const shouldMask = await utils.shouldMaskPhoneNumbers(context.tenantId);
  const maskedRecipients: RecipientResponse[] = recipients.map((r) => ({
    id: r.id,
    campaignId: r.campaignId,
    phoneNumber: shouldMask ? utils.maskPhoneNumber(r.phoneNumber) : r.phoneNumber,
    recipientName: shouldMask ? (utils.maskIfPhoneNumber(r.recipientName) ?? null) : r.recipientName,
    templateParams: r.templateParams as Record<string, any>,
    headerParams: r.headerParams as Record<string, any>,
    status: r.status as any,
    whatsappMessageId: r.whatsappMessageId ?? null,
    errorMessage: r.errorMessage ?? null,
    sentAt: r.sentAt?.toISOString(),
    deliveredAt: r.deliveredAt?.toISOString(),
    readAt: r.readAt?.toISOString(),
    createdAt: r.createdAt.toISOString(),
  }));

  return NextResponse.json({
    recipients: maskedRecipients,
    total: recipients.length,
  });
});

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

  if (campaign.status !== 'draft') {
    return NextResponse.json({ error: 'Can only add recipients to draft campaigns' }, { status: 400 });
  }

  const body = await request.json();
  const validation = importRecipientsSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({
      error: 'Validation failed',
      details: validation.error.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    }, { status: 400 });
  }

  const recipients = validation.data.recipients.map((r) => ({
    campaignId: params.id,
    phoneNumber: r.phoneNumber,
    recipientName: r.recipientName || '',
    templateParams: r.templateParams,
    headerParams: r.headerParams,
    status: 'pending' as const,
  }));

  await prisma.bulkMessageRecipient.createMany({
    data: recipients,
  });

  const totalCount = await prisma.bulkMessageRecipient.count({
    where: { campaignId: params.id },
  });

  await prisma.bulkMessageCampaign.update({
    where: { id: params.id },
    data: { totalRecipients: totalCount },
  });

  return NextResponse.json({
    message: 'Recipients added successfully',
    addedCount: recipients.length,
    totalRecipients: totalCount,
  });
});
