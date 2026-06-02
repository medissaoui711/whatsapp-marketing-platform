import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@repo/auth/src/with-auth';
import { getStorage } from '@repo/media/src/storage';
import type { AuthContext } from '@repo/auth/src/with-auth';

export const GET = withAuth(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { key: string } }
) => {
  const key = decodeURIComponent(params.key);

  if (!key.startsWith(context.tenantId)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const storage = getStorage();

  try {
    const buffer = await storage.download(key);
    const result = await storage.head(key);

    const contentType = result.contentType || 'application/octet-stream';

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
});
