import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuthAndPermission } from '@repo/auth/with-auth';

export const GET = withAuthAndPermission('webhooks:read', async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const webhookId = searchParams.get('webhookId');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

  const where: any = { webhook: { organizationId: req.organizationId } };
  if (webhookId) where.webhookId = webhookId;

  const [logs, total] = await Promise.all([
    prisma.webhookDeliveryLog.findMany({
      where,
      orderBy: { sentAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { webhook: { select: { name: true } } },
    }),
    prisma.webhookDeliveryLog.count({ where }),
  ]);

  return NextResponse.json({
    data: logs.map(l => ({
      id: l.id,
      webhookId: l.webhookId,
      webhookName: (l.webhook as any).name,
      success: l.success,
      errorMessage: l.errorMessage,
      responseCode: l.responseCode,
      sentAt: l.sentAt.toISOString(),
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});



