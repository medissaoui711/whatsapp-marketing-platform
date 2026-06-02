import { QueueConfig } from './config';
import type { RecipientJob, WebhookDeliveryJob, ImportContactsJob, ExportDataJob, CampaignStatsUpdateJob, ProcessRecordingJob } from './types';
export declare class QueueManager {
    private queues;
    private schedulers;
    private config;
    constructor(config: QueueConfig);
    private getQueue;
    private getScheduler;
    addRecipientJob(job: RecipientJob, priority?: number): Promise<string>;
    addBulkRecipientJobs(jobs: RecipientJob[]): Promise<string[]>;
    addWebhookJob(job: WebhookDeliveryJob): Promise<string>;
    addImportJob(job: ImportContactsJob): Promise<string>;
    addExportJob(job: ExportDataJob): Promise<string>;
    addCampaignStatsJob(update: CampaignStatsUpdateJob): Promise<string>;
    addMaintenanceJob(name: string, data: any): Promise<string>;
    addRecordingJob(job: ProcessRecordingJob): Promise<string>;
    getQueueMetrics(queueName: string): Promise<any>;
    getJob(jobId: string): Promise<{
        queue: string;
        job: any;
    } | null>;
    retryJob(jobId: string): Promise<boolean>;
    removeJob(jobId: string): Promise<boolean>;
    pauseQueue(queueName: string): Promise<void>;
    resumeQueue(queueName: string): Promise<void>;
    close(): Promise<void>;
}


