import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { createCampaignSchema } from '@repo/shared';
import { withAuthAndPermission, rateLimit } from '@repo/auth';
import type { AuthContext } from '@repo/auth';
import type { CampaignResponse } from '@repo/shared';
import { logAudit } from '@repo/audit';

export const GET = withAuthAndPermission('campaigns:read')(async (
  request: NextRequest,
  context: AuthContext,
) => {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
  const status = searchParams.get('status');
  const whatsappAccount = searchParams.get('whatsapp_account');
  const search = searchParams.get('search');

  const where: any = { organizationId: context.tenantId };

  if (search) {
    where.name = { contains: search, mode: 'insensitive' };
  }
  if (status) {
    where.status = status;
  }
  if (whatsappAccount) {
    where.whatsappAccount = whatsappAccount;
  }

  const [campaigns, total] = await Promise.all([
    prisma.bulkMessageCampaign.findMany({
      where,
      include: {
        template: { select: { name: true } },
        creator: { select: { fullName: true } },
        updatedBy: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.bulkMessageCampaign.count({ where }),
  ]);

  const response: CampaignResponse[] = campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    whatsappAccount: c.whatsappAccount,
    templateId: c.templateId,
    templateName: c.template?.name ?? null,
    headerMediaId: c.headerMediaId || undefined,
    headerMediaFilename: c.headerMediaFilename || undefined,
    headerMediaMimeType: c.headerMediaMimeType || undefined,
    status: c.status as any,
    totalRecipients: c.totalRecipients,
    sentCount: c.sentCount,
    deliveredCount: c.deliveredCount,
    readCount: c.readCount,
    failedCount: c.failedCount,
    scheduledAt: c.scheduledAt?.toISOString(),
    startedAt: c.startedAt?.toISOString(),
    completedAt: c.completedAt?.toISOString(),
    createdByName: c.creator?.fullName ?? null,
    updatedByName: c.updatedBy?.fullName ?? null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));

  return NextResponse.json({
    campaigns: response,
    total,
    page,
    limit,
  });
});

export const POST = withAuthAndPermission('campaigns:create')(async (
  request: NextRequest,
  context: AuthContext,
) => {
  const rateResult = await rateLimit(`campaign_create_${context.userId}`, 10, 60 * 1000);
  if (!rateResult.success) {
    return NextResponse.json({
      error: 'Too many requests',
      retryAfter: Math.ceil((rateResult.resetAt - Date.now()) / 1000),
    }, { status: 429 });
  }

  const body = await request.json();
  const validation = createCampaignSchema.safeParse(body);

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

  const template = await prisma.template.findFirst({
    where: { id: data.templateId, organizationId: context.tenantId },
  });

  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  const account = await prisma.whatsAppAccount.findFirst({
    where: { name: data.whatsappAccount, organizationId: context.tenantId },
  });

  if (!account) {
    return NextResponse.json({ error: 'WhatsApp account not found' }, { status: 404 });
  }

  const scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : undefined;

  const campaign = await prisma.bulkMessageCampaign.create({
    data: {
      organizationId: context.tenantId,
      whatsappAccount: data.whatsappAccount,
      name: data.name,
      templateId: data.templateId,
      headerMediaId: data.headerMediaId,
      status: scheduledAt ? 'scheduled' : 'draft',
      scheduledAt,
      createdBy: context.userId,
      updatedById: context.userId,
    },
    include: {
      template: { select: { name: true } },
      creator: { select: { fullName: true } },
    },
  });

  await logAudit(
    context.userId,
    context.email,
    'campaign',
    campaign.id,
    'created',
    [{ field: 'name', newValue: campaign.name }],
    context.tenantId,
  );

  const response: CampaignResponse = {
    id: campaign.id,
    name: campaign.name,
    whatsappAccount: campaign.whatsappAccount,
    templateId: campaign.templateId,
    templateName: campaign.template?.name ?? null,
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
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
  };

  return NextResponse.json(response, { status: 201 });
});


