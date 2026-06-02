import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

export async function addMessageToQueue(message: any, delay?: number) {
  const queue = new Queue('educational-messages', { connection });

  const job = await queue.add(
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

  await queue.close();
  return job;
}
