import { QueueOptions, WorkerOptions } from 'bullmq';
import Redis from 'ioredis';

export const QUEUE_NAMES = {
  RECIPIENT: 'recipient-jobs',
  WEBHOOK: 'webhook-jobs',
  IMPORT: 'import-jobs',
  EXPORT: 'export-jobs',
  CAMPAIGN_STATS: 'campaign-stats-jobs',
  MAINTENANCE: 'maintenance-jobs',
  RECORDING: 'recording-jobs',
} as const;

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];

export interface QueueConfig {
  redisUrl: string;
  prefix?: string;
  defaultJobOptions?: {
    attempts?: number;
    backoff?: {
      type: 'exponential' | 'fixed';
      delay: number;
    };
    removeOnComplete?: boolean | number;
    removeOnFail?: boolean | number;
    timeout?: number;
  };
}

export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 } as const,
  removeOnComplete: 100,
  removeOnFail: 500,
  timeout: 30000,
};

export const JOB_PRIORITIES = {
  HIGH: 1,
  NORMAL: 5,
  LOW: 10,
};

export function createQueueConfig(config: QueueConfig): QueueOptions {
  return {
    connection: { url: config.redisUrl },
    prefix: config.prefix || 'whatomate',
    defaultJobOptions: { ...DEFAULT_JOB_OPTIONS, ...config.defaultJobOptions },
  };
}

export function createWorkerConfig(config: QueueConfig): WorkerOptions {
  return {
    connection: { url: config.redisUrl },
    prefix: config.prefix || 'whatomate',
    concurrency: 5,
    limiter: {
      max: 100,
      duration: 1000,
    },
  };
}

let redisConnection: Redis | null = null;

export function getRedisConnection(): Redis {
  if (!redisConnection) {
    redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }
  return redisConnection;
}


