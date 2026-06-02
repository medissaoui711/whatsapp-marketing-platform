import { Worker, Queue } from 'bullmq';
import { getRedisConnection } from '@repo/queue';
import { LinkedInScraper } from '@repo/scraper';
import { prisma } from '@repo/db';

export interface LinkedInJobData {
  jobId: string;
  tenantId: string;
  userId: string;
  type: 'profile' | 'search' | 'company' | 'connections';
  target: string;
}

export const linkedinQueue = new Queue<LinkedInJobData>('linkedin-scraper', {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 30000 },
    timeout: 300000,
  },
});

export class LinkedInWorker {
  private worker: Worker;

  constructor() {
    this.worker = new Worker<LinkedInJobData>(
      'linkedin-scraper',
      async (job) => this.processJob(job.data),
      {
        connection: getRedisConnection(),
        concurrency: 2,
      }
    );

    this.setupEventHandlers();
  }

  private async processJob(data: LinkedInJobData): Promise<Record<string, unknown>> {
    const { jobId, tenantId, type, target } = data;
    console.log(`[LinkedInWorker] Starting scrape for ${target} (job=${jobId})`);

    await this.updateJobProgress(jobId, 10, tenantId);

    const scraper = new LinkedInScraper();

    let result: Record<string, unknown>;

    switch (type) {
      case 'profile':
        result = await scraper.scrapeProfile({
          id: jobId,
          tenantId,
          userId: data.userId,
          type,
          target,
          status: 'running',
          progress: 0,
          currentPage: 1,
          totalPages: 1,
          resultsCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        break;
      default:
        throw new Error(`Unsupported LinkedIn scrape type: ${type}`);
    }

    await this.storeResults(jobId, tenantId, type, target, result);
    await this.completeJob(jobId);

    return result;
  }

  private async updateJobProgress(jobId: string, progress: number, _tenantId: string): Promise<void> {
    console.log(`[LinkedInWorker] Job ${jobId} progress: ${progress}%`);
    try {
      await prisma.scrapingJob.update({
        where: { id: jobId },
        data: { progress },
      });
    } catch {
      // job may not exist in DB yet
    }
  }

  private async storeResults(
    jobId: string,
    tenantId: string,
    type: string,
    target: string,
    profile: Record<string, unknown>,
  ): Promise<void> {
    try {
      await prisma.scrapedData.create({
        data: {
          jobId,
          platform: 'linkedin',
          type,
          data: profile as unknown as Record<string, unknown>,
          sourceUrl: `https://linkedin.com/in/${target}`,
        },
      });
    } catch {
      console.warn(`[LinkedInWorker] Could not store results for job ${jobId} – DB may be unavailable`);
    }
  }

  private async completeJob(jobId: string): Promise<void> {
    try {
      await prisma.scrapingJob.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          progress: 100,
          updatedAt: new Date(),
        },
      });
    } catch {
      console.warn(`[LinkedInWorker] Could not mark job ${jobId} as completed`);
    }
  }

  private setupEventHandlers(): void {
    this.worker.on('completed', (job) => {
      console.log(`[LinkedInWorker] Job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`[LinkedInWorker] Job ${job?.id} failed:`, err.message);
    });

    this.worker.on('error', (err) => {
      console.error('[LinkedInWorker] Worker error:', err);
    });
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}
