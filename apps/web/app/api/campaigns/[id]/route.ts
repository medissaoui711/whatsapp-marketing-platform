import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { updateCampaignSchema } from '@repo/shared';
import { withAuthAndPermission } from '@repo/auth';
import type { AuthContext } from '@repo/auth';
import type { CampaignResponse } from '@repo/shared';
import { logAudit, generateChanges } from '@repo/audit';

export const GET = withAuthAndPermission('campaigns:read')(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } },
) => {
  const campaign = await prisma.bulkMessageCampaign.findFirst({
    where: { id: params.id, organizationId: context.tenantId },
    include: {
      template: { select: { name: true } },
      creator: { select: { fullName: true } },
      updatedBy: { select: { fullName: true } },
    },
  });

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  const response: CampaignResponse = {
    id: campaign.id,
    name: campaign.name,
    whatsappAccount: campaign.whatsappAccount,
    templateId: campaign.templateId,
    templateName: campaign.template?.name ?? null,
    headerMediaId: campaign.headerMediaId || undefined,
    headerMediaFilename: campaign.headerMediaFilename || undefined,
    headerMediaMimeType: campaign.headerMediaMimeType || undefined,
    status: campaign.status as any,
    totalRecipients: campaign.totalRecipients,
    sentCount: campaign.sentCount,
    deliveredCount: campaign.deliveredCount,
    readCount: campaign.readCount,
    failedCount: campaign.failedCount,
    scheduledAt: campaign.scheduledAt?.toISOString(),
    startedAt: campaign.startedAt?.toISOString(),
    completedAt: campaign.completedAt?.toISOString(),
    createdByName: campaign.creator?.fullName ?? null,
    updatedByName: campaign.updatedBy?.fullName ?? null,
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
  };

  return NextResponse.json(response);
});

export const PUT = withAuthAndPermission('campaigns:update')(async (
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
    return NextResponse.json({ error: 'Can only update draft campaigns' }, { status: 400 });
  }

  const body = await request.json();
  const validation = updateCampaignSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({
      error: 'Validation failed',
      details: validation.error.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    }, { status: 400 });
  }

  const data = validation.data;
  const updateData: any = { updatedById: context.userId };

  if (data.name) updateData.name = data.name;
  if (data.scheduledAt) updateData.scheduledAt = new Date(data.scheduledAt);

  if (data.templateId) {
    const template = await prisma.template.findFirst({
      where: { id: data.templateId, organizationId: context.tenantId },
    });
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    updateData.templateId = data.templateId;
  }

  if (data.whatsappAccount) {
    const account = await prisma.whatsAppAccount.findFirst({
      where: { name: data.whatsappAccount, organizationId: context.tenantId },
    });
    if (!account) {
      return NextResponse.json({ error: 'WhatsApp account not found' }, { status: 404 });
    }
    updateData.whatsappAccount = data.whatsappAccount;
  }

  const updatedCampaign = await prisma.bulkMessageCampaign.update({
    where: { id: params.id },
    data: updateData,
    include: {
      template: { select: { name: true } },
      creator: { select: { fullName: true } },
      updatedBy: { select: { fullName: true } },
    },
  });

  await logAudit(
    context.userId,
    context.email,
    'campaign',
    campaign.id,
    'updated',
    generateChanges(campaign, updateData),
    context.tenantId,
  );

  const response: CampaignResponse = {
    id: updatedCampaign.id,
    name: updatedCampaign.name,
    whatsappAccount: updatedCampaign.whatsappAccount,
    templateId: updatedCampaign.templateId,
    templateName: updatedCampaign.template?.name ?? null,
    headerMediaId: updatedCampaign.headerMediaId || undefined,
    headerMediaFilename: updatedCampaign.headerMediaFilename || undefined,
    headerMediaMimeType: updatedCampaign.headerMediaMimeType || undefined,
    status: updatedCampaign.status as any,
    totalRecipients: updatedCampaign.totalRecipients,
    sentCount: updatedCampaign.sentCount,
    deliveredCount: updatedCampaign.deliveredCount,
    readCount: updatedCampaign.readCount,
    failedCount: updatedCampaign.failedCount,
    scheduledAt: updatedCampaign.scheduledAt?.toISOString(),
    startedAt: updatedCampaign.startedAt?.toISOString(),
    completedAt: updatedCampaign.completedAt?.toISOString(),
    createdByName: updatedCampaign.creator?.fullName ?? null,
    updatedByName: updatedCampaign.updatedBy?.fullName ?? null,
    createdAt: updatedCampaign.createdAt.toISOString(),
    updatedAt: updatedCampaign.updatedAt.toISOString(),
  };

  return NextResponse.json(response);
});

export const DELETE = withAuthAndPermission('campaigns:delete')(async (
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

  if (campaign.status === 'processing' || campaign.status === 'queued') {
    return NextResponse.json({ error: 'Cannot delete running campaign' }, { status: 400 });
  }

  await prisma.bulkMessageRecipient.deleteMany({
    where: { campaignId: params.id },
  });

  await prisma.bulkMessageCampaign.delete({
    where: { id: params.id },
  });

  await logAudit(
    context.userId,
    context.email,
    'campaign',
    campaign.id,
    'deleted',
    [{ field: 'name', oldValue: campaign.name }],
    context.tenantId,
  );

  return NextResponse.json({ message: 'Campaign deleted successfully' });
});
