import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuthAndPermission } from '@repo/auth';
import { updateWebhookSchema } from '@repo/shared/src/schemas/webhook';
import { logAudit } from '@repo/audit';
import { invalidateWebhooksCache } from '@repo/cache';

async function getWebhook(req: NextRequest, id: string) {
  const webhook = await prisma.webhook.findFirst({
    where: { id, organizationId: req.organizationId },
  });
  if (!webhook) {
    return NextResponse.json({ error: 'Webhook not found.' }, { status: 404 });
  }
  return webhook;
}

export const GET = withAuthAndPermission('webhooks:read', async (req: NextRequest, { params }: { params: { id: string } }) => {
  const webhook = await prisma.webhook.findFirst({
    where: { id: params.id, organizationId: req.organizationId },
  });
  if (!webhook) {
    return NextResponse.json({ error: 'Webhook not found.' }, { status: 404 });
  }

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
  });
});

export const PUT = withAuthAndPermission('webhooks:update', async (req: NextRequest, { params }: { params: { id: string } }) => {
  const webhook = await getWebhook(req, params.id);
  if (webhook instanceof NextResponse) return webhook;

  const body = await req.json();
  const parsed = updateWebhookSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const updated = await prisma.webhook.update({
    where: { id: params.id },
    data: {
      ...parsed.data,
      updatedById: req.userId,
    },
  });

  await invalidateWebhooksCache(req.organizationId);
  await logAudit(req.userId, req.userName, 'webhook', updated.id, 'update', { name: updated.name }, req.organizationId);

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    url: updated.url,
    events: updated.events,
    headers: updated.headers,
    hasSecret: !!updated.secret,
    isActive: updated.isActive,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
});

export const DELETE = withAuthAndPermission('webhooks:delete', async (req: NextRequest, { params }: { params: { id: string } }) => {
  const webhook = await getWebhook(req, params.id);
  if (webhook instanceof NextResponse) return webhook;

  await prisma.webhook.delete({ where: { id: params.id } });

  await invalidateWebhooksCache(req.organizationId);
  await logAudit(req.userId, req.userName, 'webhook', params.id, 'delete', { name: webhook.name }, req.organizationId);

  return NextResponse.json({ success: true });
});
