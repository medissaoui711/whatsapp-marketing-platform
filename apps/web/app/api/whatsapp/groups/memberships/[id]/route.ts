import { NextResponse } from 'next/server';
import { withAuth } from '@repo/auth';
import { groupJoinService } from '@repo/integrations/whatsapp/groups/join-service';

export const DELETE = withAuth(async (request, context, { params }) => {
  try {
    const { id } = params;

    await groupJoinService.leaveGroup(id, context.tenantId, context.userId, context.email);

    return NextResponse.json({ success: true, message: 'Left group successfully' });
  } catch (error: any) {
    console.error('Leave group error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
});
