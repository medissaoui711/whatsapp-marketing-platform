import { Worker } from 'bullmq';
import { prisma } from '@repo/db';
import { WebhookDeliveryJob, JobResult, getRedisConnection } from '@repo/queue';

export class WebhookWorker {
  private worker: Worker;

  constructor() {
    this.worker = new Worker(
      'webhook-jobs',
      async (job) => this.deliverWebhook(job.data as WebhookDeliveryJob),
      {
        connection: getRedisConnection(),
        concurrency: 10,
      }
    );

    this.setupEventHandlers();
  }

  private async deliverWebhook(job: WebhookDeliveryJob): Promise<JobResult> {
    const { webhookId, event, payload, retryCount = 0 } = job;

    try {
      const webhook = await prisma.webhook.findUnique({
        where: { id: webhookId },
      });

      if (!webhook || !webhook.isActive) {
        return { success: false, error: 'Webhook not found or inactive' };
      }

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...((webhook.headers as Record<string, string>) || {}),
        },
        body: JSON.stringify({
          event,
          timestamp: new Date().toISOString(),
          data: payload,
        }),
      });

      await prisma.webhookDeliveryLog.create({
        data: {
          webhookId,
          success: response.ok,
          statusCode: response.status,
          responseBody: await response.text().catch(() => null),
          payload,
          retryCount,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return { success: true, data: { statusCode: response.status } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private setupEventHandlers(): void {
    this.worker.on('completed', (job) => {
      console.log(`Webhook job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`Webhook job ${job?.id} failed:`, err);
    });
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}


