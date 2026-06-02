import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredSessions } from '@repo/auth/session';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const count = await cleanupExpiredSessions();

  return NextResponse.json({
    message: `Cleaned up ${count} expired sessions`,
    timestamp: new Date().toISOString(),
  });
}


