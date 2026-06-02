import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndPermission } from '@repo/auth';
import { getQueueManager } from '@/lib/queue';
import type { AuthContext } from '@repo/auth';

export const GET = withAuthAndPermission('analytics:read')(async (
  request: NextRequest,
  context: AuthContext,
) => {
  const queueManager = getQueueManager();

  const metrics = {
    recipient: await queueManager.getQueueMetrics('recipient-jobs'),
    webhook: await queueManager.getQueueMetrics('webhook-jobs'),
    import: await queueManager.getQueueMetrics('import-jobs'),
    export: await queueManager.getQueueMetrics('export-jobs'),
    campaignStats: await queueManager.getQueueMetrics('campaign-stats-jobs'),
    maintenance: await queueManager.getQueueMetrics('maintenance-jobs'),
    recording: await queueManager.getQueueMetrics('recording-jobs'),
  };

  return NextResponse.json(metrics);
});


