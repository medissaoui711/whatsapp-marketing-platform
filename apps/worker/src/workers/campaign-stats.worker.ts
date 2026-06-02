import { Worker } from 'bullmq';
import { prisma } from '@repo/db';
import { CampaignStatsUpdateJob, JobResult, getRedisConnection } from '@repo/queue';

export class CampaignStatsWorker {
  private worker: Worker;

  constructor() {
    this.worker = new Worker(
      'campaign-stats-jobs',
      async (job) => this.updateStats(job.data as CampaignStatsUpdateJob),
      {
        connection: getRedisConnection(),
        concurrency: 1,
      }
    );

    this.setupEventHandlers();
  }

  private async updateStats(job: CampaignStatsUpdateJob): Promise<JobResult> {
    const { campaignId, organizationId, status, sentCount, deliveredCount, readCount, failedCount } = job;

    try {
      await prisma.bulkMessageCampaign.update({
        where: { id: campaignId, organizationId },
        data: {
          status: status as any,
          sentCount,
          deliveredCount,
          readCount,
          failedCount,
        },
      });

      return { success: true };
    } catch (error) {
      console.error(`Failed to update campaign stats for ${campaignId}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private setupEventHandlers(): void {
    this.worker.on('completed', (job) => {
      console.log(`Campaign stats job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`Campaign stats job ${job?.id} failed:`, err);
    });
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}


