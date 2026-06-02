import { Worker, Job, Queue } from 'bullmq';
import { EducationalMessagingService } from '@repo/integrations/whatsapp/educational-message';
import { prisma } from '@repo/db';
import { dispatchWebhook } from '@repo/webhooks';
import { getRedisConnection } from '@repo/queue';

const connection = getRedisConnection();

export class EducationalMessageWorker {
  private worker: Worker;

  constructor() {
    this.worker = new Worker(
      'educational-messages',
      async (job: Job) => this.processJob(job),
      {
        connection,
        concurrency: 5,
        limiter: { max: 30, duration: 1000 },
      }
    );

    this.setupEventHandlers();
  }

  private async processJob(job: Job) {
    const { message } = job.data;
    const service = new EducationalMessagingService();

    console.log(
      `📨 Processing educational message for ${message.to} (Attempt ${job.attemptsMade + 1})`
    );

    try {
      const messageId = await service.sendEducationalMessage(message);

      await job.updateProgress(100);

      await dispatchWebhook(message.tenantId, 'message.sent', {
        messageId,
        to: message.to,
        templateName: message.templateName,
        campaignId: message.campaignId,
      });

      return { success: true, messageId };
    } catch (error: any) {
      console.error(`❌ Failed to send message: ${error.message}`);

      await prisma.message.updateMany({
        where: {
          templateName: message.templateName,
          metadata: { path: ['campaign_id'], equals: message.campaignId },
          createdAt: { gte: new Date(Date.now() - 60000) },
        },
        data: {
          status: 'failed',
          errorMessage: error.message,
        },
      });

      throw error;
    }
  }

  private setupEventHandlers(): void {
    this.worker.on('completed', (job) => {
      console.log(`✅ Job ${job.id} completed successfully`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`❌ Job ${job?.id} failed:`, err);
    });

    this.worker.on('error', (err) => {
      console.error('Worker error:', err);
    });
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}

export async function addMessageToQueue(message: any, delay?: number) {
  const educationalMessageQueue = new Queue('educational-messages', { connection });

  const job = await educationalMessageQueue.add(
    'send-educational-message',
    { message },
    {
      delay: delay || 0,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    }
  );

  await educationalMessageQueue.close();
  return job;
}
