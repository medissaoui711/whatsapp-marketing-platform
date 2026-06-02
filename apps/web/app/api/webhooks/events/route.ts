import { NextResponse } from 'next/server';
import { withAuthAndPermission } from '@repo/auth/with-auth';
import { AvailableWebhookEvents } from '@repo/shared/src/schemas/webhook';

export const GET = withAuthAndPermission('webhooks:read', async () => {
  return NextResponse.json({ data: AvailableWebhookEvents });
});



