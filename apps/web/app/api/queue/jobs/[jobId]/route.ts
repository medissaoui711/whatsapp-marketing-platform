import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndPermission } from '@repo/auth';
import { getQueueManager } from '@/lib/queue';
import type { AuthContext } from '@repo/auth';

export const DELETE = withAuthAndPermission('analytics:write')(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { jobId: string } },
) => {
  const queueManager = getQueueManager();
  const success = await queueManager.removeJob(params.jobId);

  if (!success) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
});
