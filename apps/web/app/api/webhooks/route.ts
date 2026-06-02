import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuthAndPermission } from '@repo/auth/with-auth';
import { createWebhookSchema } from '@repo/shared/src/schemas/webhook';
import { logAudit } from '@repo/audit';
import { invalidateWebhooksCache } from '@repo/cache';

export const GET = withAuthAndPermission('webhooks:read', async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
  const search = searchParams.get('search') || '';
  const isActive = searchParams.get('isActive');

  const where: any = { organizationId: req.organizationId };
  if (search) where.name = { contains: search };
  if (isActive !== null) where.isActive = isActive === 'true';

  const [webhooks, total] = await Promise.all([
    prisma.webhook.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.webhook.count({ where }),
  ]);

  return NextResponse.json({
    data: webhooks.map(w => ({
      id: w.id,
      name: w.name,
      url: w.url,
      events: w.events,
      headers: w.headers,
      hasSecret: !!w.secret,
      isActive: w.isActive,
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

export const POST = withAuthAndPermission('webhooks:create', async (req: NextRequest) => {
  const body = await req.json();
  const parsed = createWebhookSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const existing = await prisma.webhook.count({ where: { organizationId: req.organizationId } });
  if (existing >= 20) {
    return NextResponse.json({ error: 'Maximum 20 webhooks per organization.' }, { status: 400 });
  }

  const webhook = await prisma.webhook.create({
    data: {
      organizationId: req.organizationId,
      name: parsed.data.name,
      url: parsed.data.url,
      events: parsed.data.events,
      headers: parsed.data.headers,
      secret: parsed.data.secret,
      isActive: parsed.data.isActive,
      createdById: req.userId,
    },
  });

  await invalidateWebhooksCache(req.organizationId);
  await logAudit(req.userId, req.userName, 'webhook', webhook.id, 'create', { name: webhook.name }, req.organizationId);

  return NextResponse.json({
    id: webhook.id,
    name: webhook.name,
    url: webhook.url,
    events: webhook.events,
    headers: webhook.headers,
    hasSecret: !!webhook.secret,
    isActive: webhook.isActive,
    createdAt: webhook.createdAt.toISOString(),
    updatedAt: webhook.updatedAt.toISOString(),
  }, { status: 201 });
});



