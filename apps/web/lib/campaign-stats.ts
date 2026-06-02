import { getWebSocketHub } from '@/lib/websocket';
import { prisma } from '@repo/db';
import { MessageType } from '@repo/websocket';

export async function incrementCampaignStat(
  campaignId: string,
  status: 'delivered' | 'read' | 'failed',
): Promise<void> {
  const columnMap: Record<string, string> = {
    delivered: 'deliveredCount',
    read: 'readCount',
    failed: 'failedCount',
  };

  const column = columnMap[status];

  const updated = await prisma.bulkMessageCampaign.update({
    where: { id: campaignId },
    data: { [column]: { increment: 1 } },
  });

  const wsHub = getWebSocketHub();
  if (wsHub) {
    wsHub.broadcastToOrg(updated.organizationId, {
      type: MessageType.CAMPAIGN_STATS_UPDATE,
      payload: {
        campaign_id: campaignId,
        status: updated.status,
        sent_count: updated.sentCount,
        delivered_count: updated.deliveredCount,
        read_count: updated.readCount,
        failed_count: updated.failedCount,
      },
    });
  }
}

export async function recalculateCampaignStats(campaignId: string): Promise<void> {
  await prisma.bulkMessageCampaign.update({
    where: { id: campaignId },
    data: {},
  });
}


