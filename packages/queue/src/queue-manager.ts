import { Queue, QueueScheduler } from 'bullmq';
import { QUEUE_NAMES, QueueConfig, createQueueConfig, getRedisConnection } from './config';
import type { RecipientJob, WebhookDeliveryJob, ImportContactsJob, ExportDataJob, CampaignStatsUpdateJob, CleanupAuditLogsJob, ProcessRecordingJob } from './types';

export class QueueManager {
  private queues: Map<string, Queue> = new Map();
  private schedulers: Map<string, QueueScheduler> = new Map();
  private config: QueueConfig;

  constructor(config: QueueConfig) {
    this.config = config;
  }

  private getQueue(name: string): Queue {
    if (!this.queues.has(name)) {
      const queue = new Queue(name, createQueueConfig(this.config));
      this.queues.set(name, queue);
      this.getScheduler(name);
      queue.on('added', (job) => {
        console.debug(`[QueueManager] Job ${job.id} added to queue ${name}`);
      });
    }
    return this.queues.get(name)!;
  }

  private getScheduler(name: string): QueueScheduler {
    if (!this.schedulers.has(name)) {
      const scheduler = new QueueScheduler(name, {
        connection: getRedisConnection(),
        prefix: this.config.prefix || 'whatomate',
      });
      this.schedulers.set(name, scheduler);
    }
    return this.schedulers.get(name)!;
  }

  async addRecipientJob(job: RecipientJob, priority?: number): Promise<string> {
    const queue = this.getQueue(QUEUE_NAMES.RECIPIENT);
    const result = await queue.add('recipient', job, {
      priority: priority ?? 5,
      jobId: `${job.campaignId}:${job.recipientId}`,
    });
    return result.id!;
  }

  async addBulkRecipientJobs(jobs: RecipientJob[]): Promise<string[]> {
    const queue = this.getQueue(QUEUE_NAMES.RECIPIENT);
    const results = await queue.addBulk(
      jobs.map(job => ({
        name: 'recipient',
        data: job,
        opts: {
          priority: JOB_PRIORITIES.NORMAL,
          jobId: `${job.campaignId}:${job.recipientId}`,
        },
      }))
    );
    return results.map(r => r.id!);
  }

  async addWebhookJob(job: WebhookDeliveryJob): Promise<string> {
    const queue = this.getQueue(QUEUE_NAMES.WEBHOOK);
    const result = await queue.add('webhook', job, {
      attempts: job.maxRetries ?? 5,
      backoff: { type: 'exponential', delay: 5000 },
      priority: JOB_PRIORITIES.HIGH,
    });
    return result.id!;
  }

  async addImportJob(job: ImportContactsJob): Promise<string> {
    const queue = this.getQueue(QUEUE_NAMES.IMPORT);
    const result = await queue.add('import', job, {
      priority: JOB_PRIORITIES.LOW,
      timeout: 300000,
    });
    return result.id!;
  }

  async addExportJob(job: ExportDataJob): Promise<string> {
    const queue = this.getQueue(QUEUE_NAMES.EXPORT);
    const result = await queue.add('export', job, {
      priority: JOB_PRIORITIES.LOW,
    });
    return result.id!;
  }

  async addCampaignStatsJob(update: CampaignStatsUpdateJob): Promise<string> {
    const queue = this.getQueue(QUEUE_NAMES.CAMPAIGN_STATS);
    const result = await queue.add('campaign_stats', update, {
      priority: JOB_PRIORITIES.HIGH,
      attempts: 2,
    });
    return result.id!;
  }

  async addMaintenanceJob(name: string, data: any): Promise<string> {
    const queue = this.getQueue(QUEUE_NAMES.MAINTENANCE);
    const result = await queue.add(name, data, {
      priority: JOB_PRIORITIES.LOW,
      repeat: { cron: '0 0 * * *' },
    });
    return result.id!;
  }

  async addRecordingJob(job: ProcessRecordingJob): Promise<string> {
    const queue = this.getQueue(QUEUE_NAMES.RECORDING);
    const result = await queue.add('process_recording', job, {
      priority: JOB_PRIORITIES.NORMAL,
      timeout: 600000,
    });
    return result.id!;
  }

  async getQueueMetrics(queueName: string): Promise<any> {
    const queue = this.getQueue(queueName);
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }

  async getJob(jobId: string): Promise<{ queue: string; job: any } | null> {
    for (const [name, queue] of this.queues) {
      const job = await queue.getJob(jobId);
      if (job) {
        return { queue: name, job };
      }
    }
    return null;
  }

  async retryJob(jobId: string): Promise<boolean> {
    const result = await this.getJob(jobId);
    if (!result) return false;
    await result.job.retry();
    return true;
  }

  async removeJob(jobId: string): Promise<boolean> {
    const result = await this.getJob(jobId);
    if (!result) return false;
    await result.job.remove();
    return true;
  }

  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.pause();
  }

  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.resume();
  }

  async close(): Promise<void> {
    for (const queue of this.queues.values()) {
      await queue.close();
    }
    for (const scheduler of this.schedulers.values()) {
      await scheduler.close();
    }
  }
}

const JOB_PRIORITIES = {
  HIGH: 1,
  NORMAL: 5,
  LOW: 10,
};


