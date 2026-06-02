"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueManager = void 0;
const bullmq_1 = require("bullmq");
const config_1 = require("./config");
class QueueManager {
    constructor(config) {
        this.queues = new Map();
        this.schedulers = new Map();
        this.config = config;
    }
    getQueue(name) {
        if (!this.queues.has(name)) {
            const queue = new bullmq_1.Queue(name, (0, config_1.createQueueConfig)(this.config));
            this.queues.set(name, queue);
            queue.on('added', (job) => {
                console.debug(`[QueueManager] Job ${job.id} added to queue ${name}`);
            });
        }
        return this.queues.get(name);
    }
    getScheduler(name) {
        if (!this.schedulers.has(name)) {
            const scheduler = new bullmq_1.QueueScheduler(name, {
                connection: (0, config_1.getRedisConnection)(),
                prefix: this.config.prefix || 'whatomate',
            });
            this.schedulers.set(name, scheduler);
        }
        return this.schedulers.get(name);
    }
    async addRecipientJob(job, priority) {
        const queue = this.getQueue(config_1.QUEUE_NAMES.RECIPIENT);
        const result = await queue.add('recipient', job, {
            priority: priority ?? 5,
            jobId: `${job.campaignId}:${job.recipientId}`,
        });
        return result.id;
    }
    async addBulkRecipientJobs(jobs) {
        const queue = this.getQueue(config_1.QUEUE_NAMES.RECIPIENT);
        const results = await queue.addBulk(jobs.map(job => ({
            name: 'recipient',
            data: job,
            opts: {
                priority: JOB_PRIORITIES.NORMAL,
                jobId: `${job.campaignId}:${job.recipientId}`,
            },
        })));
        return results.map(r => r.id);
    }
    async addWebhookJob(job) {
        const queue = this.getQueue(config_1.QUEUE_NAMES.WEBHOOK);
        const result = await queue.add('webhook', job, {
            attempts: job.maxRetries ?? 5,
            backoff: { type: 'exponential', delay: 5000 },
            priority: JOB_PRIORITIES.HIGH,
        });
        return result.id;
    }
    async addImportJob(job) {
        const queue = this.getQueue(config_1.QUEUE_NAMES.IMPORT);
        const result = await queue.add('import', job, {
            priority: JOB_PRIORITIES.LOW,
            timeout: 300000,
        });
        return result.id;
    }
    async addExportJob(job) {
        const queue = this.getQueue(config_1.QUEUE_NAMES.EXPORT);
        const result = await queue.add('export', job, {
            priority: JOB_PRIORITIES.LOW,
        });
        return result.id;
    }
    async addCampaignStatsJob(update) {
        const queue = this.getQueue(config_1.QUEUE_NAMES.CAMPAIGN_STATS);
        const result = await queue.add('campaign_stats', update, {
            priority: JOB_PRIORITIES.HIGH,
            attempts: 2,
        });
        return result.id;
    }
    async addMaintenanceJob(name, data) {
        const queue = this.getQueue(config_1.QUEUE_NAMES.MAINTENANCE);
        const result = await queue.add(name, data, {
            priority: JOB_PRIORITIES.LOW,
            repeat: { cron: '0 0 * * *' },
        });
        return result.id;
    }
    async addRecordingJob(job) {
        const queue = this.getQueue(config_1.QUEUE_NAMES.RECORDING);
        const result = await queue.add('process_recording', job, {
            priority: JOB_PRIORITIES.NORMAL,
            timeout: 600000,
        });
        return result.id;
    }
    async getQueueMetrics(queueName) {
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
    async getJob(jobId) {
        for (const [name, queue] of this.queues) {
            const job = await queue.getJob(jobId);
            if (job) {
                return { queue: name, job };
            }
        }
        return null;
    }
    async retryJob(jobId) {
        const result = await this.getJob(jobId);
        if (!result)
            return false;
        await result.job.retry();
        return true;
    }
    async removeJob(jobId) {
        const result = await this.getJob(jobId);
        if (!result)
            return false;
        await result.job.remove();
        return true;
    }
    async pauseQueue(queueName) {
        const queue = this.getQueue(queueName);
        await queue.pause();
    }
    async resumeQueue(queueName) {
        const queue = this.getQueue(queueName);
        await queue.resume();
    }
    async close() {
        for (const queue of this.queues.values()) {
            await queue.close();
        }
        for (const scheduler of this.schedulers.values()) {
            await scheduler.close();
        }
    }
}
exports.QueueManager = QueueManager;
const JOB_PRIORITIES = {
    HIGH: 1,
    NORMAL: 5,
    LOW: 10,
};
//# sourceMappingURL=queue-manager.js.map