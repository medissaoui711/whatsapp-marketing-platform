import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuthAndPermission } from '@repo/auth';
import { dispatchWebhook } from '@repo/webhooks';
import { logAudit } from '@repo/audit';

export const POST = withAuthAndPermission('webhooks:update', async (req: NextRequest, { params }: { params: { id: string } }) => {
  const webhook = await prisma.webhook.findFirst({
    where: { id: params.id, organizationId: req.organizationId },
  });
  if (!webhook) {
    return NextResponse.json({ error: 'Webhook not found.' }, { status: 404 });
  }

  try {
    await dispatchWebhook(req.organizationId, 'test', {
      webhookId: webhook.id,
      webhookName: webhook.name,
      timestamp: new Date().toISOString(),
      message: 'This is a test webhook event.',
    });

    await logAudit(req.userId, req.userName, 'webhook', webhook.id, 'updated', { action: 'test_dispatched' }, req.organizationId);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Webhook dispatch failed', details: String(err) }, { status: 500 });
  }
});
