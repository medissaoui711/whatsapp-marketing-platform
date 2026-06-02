import { NextResponse } from 'next/server';
import { withAuth } from '@repo/auth';
import { groupJoinService } from '@repo/integrations/whatsapp/groups/join-service';

export const GET = withAuth(async (request, context) => {
  try {
    const memberships = await groupJoinService.getUserGroups(context.tenantId, context.userId);
    const pendingRequests = await groupJoinService.getPendingRequests(
      context.tenantId,
      context.userId
    );

    return NextResponse.json({ memberships, pendingRequests });
  } catch (error) {
    console.error('Get memberships error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
