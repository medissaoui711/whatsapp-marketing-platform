import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndPermission } from '@repo/auth';
import { serveMedia } from '@repo/media';
import type { AuthContext } from '@repo/auth';

export const GET = withAuthAndPermission('chat:read')(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { messageId: string } },
) => {
  const result = await serveMedia(params.messageId, context.userId, context.tenantId);

  if (!result) {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 });
  }

  return new NextResponse(result.data, {
    status: 200,
    headers: {
      'Content-Type': result.contentType,
      'Cache-Control': 'private, max-age=3600',
    },
  });
});
