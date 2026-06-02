import { QueueManager, QueueConfig, QUEUE_NAMES } from '@repo/queue';

let queueManager: QueueManager | null = null;

export function initQueueManager(): void {
  if (queueManager) return;

  const config: QueueConfig = {
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    prefix: 'whatomate',
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 500,
      timeout: 30000,
    },
  };

  queueManager = new QueueManager(config);
}

export function getQueueManager(): QueueManager {
  if (!queueManager) {
    initQueueManager();
  }
  return queueManager!;
}


