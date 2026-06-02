import { Queue, Worker, QueueOptions, WorkerOptions, Job } from 'bullmq';
import IORedis from 'ioredis';
import type { RecipientJob } from './types';
export declare const RECIPIENT_QUEUE = "recipient-jobs";
export declare const redis: IORedis;
export declare function createQueue(name: string, opts?: Partial<QueueOptions>): Queue<any, any, string, any, any, string>;
export declare function createWorker<T = unknown>(name: string, processor: (job: Job<T>) => Promise<void>, opts?: Partial<WorkerOptions>): Worker<T, void, string>;
export declare function enqueueRecipientJob(job: RecipientJob): Promise<void>;
export declare function enqueueRecipientJobs(jobs: RecipientJob[]): Promise<void>;


