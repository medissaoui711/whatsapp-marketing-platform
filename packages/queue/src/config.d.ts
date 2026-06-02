import { QueueOptions, WorkerOptions } from 'bullmq';
import Redis from 'ioredis';
export declare const QUEUE_NAMES: {
    readonly RECIPIENT: "recipient-jobs";
    readonly WEBHOOK: "webhook-jobs";
    readonly IMPORT: "import-jobs";
    readonly EXPORT: "export-jobs";
    readonly CAMPAIGN_STATS: "campaign-stats-jobs";
    readonly MAINTENANCE: "maintenance-jobs";
    readonly RECORDING: "recording-jobs";
};
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
export declare const DEFAULT_JOB_OPTIONS: {
    attempts: number;
    backoff: {
        readonly type: "exponential";
        readonly delay: 5000;
    };
    removeOnComplete: number;
    removeOnFail: number;
    timeout: number;
};
export declare const JOB_PRIORITIES: {
    HIGH: number;
    NORMAL: number;
    LOW: number;
};
export declare function createQueueConfig(config: QueueConfig): QueueOptions;
export declare function createWorkerConfig(config: QueueConfig): WorkerOptions;
export declare function getRedisConnection(): Redis;


