import { NextResponse } from 'next/server';
import { withAuth } from '@repo/auth';
import { groupJoinService } from '@repo/integrations/whatsapp/groups/join-service';

export const POST = withAuth(async (request, context, { params }) => {
  try {
    const { requestId } = params;

    const membership = await groupJoinService.approveJoinRequest(
      requestId,
      context.tenantId,
      context.userId,
      context.email
    );

    return NextResponse.json({ success: true, membership });
  } catch (error: any) {
    console.error('Approve join error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
});
