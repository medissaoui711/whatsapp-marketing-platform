"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = exports.RECIPIENT_QUEUE = void 0;
exports.createQueue = createQueue;
exports.createWorker = createWorker;
exports.enqueueRecipientJob = enqueueRecipientJob;
exports.enqueueRecipientJobs = enqueueRecipientJobs;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
exports.RECIPIENT_QUEUE = 'recipient-jobs';
function redisUrl() {
    return process.env.REDIS_URL || 'redis://localhost:6379';
}
function redisConfig() {
    return { url: redisUrl() };
}
let _redis = null;
function getRedis() {
    if (!_redis) {
        _redis = new ioredis_1.default(redisUrl(), {
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
        });
    }
    return _redis;
}
exports.redis = new Proxy({}, {
    get(_, prop) {
        return getRedis()[prop];
    },
});
function createQueue(name, opts) {
    return new bullmq_1.Queue(name, {
        connection: redisConfig(),
        defaultJobOptions: {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 1000,
            },
            removeOnComplete: {
                age: 3600,
                count: 100,
            },
        },
        ...opts,
    });
}
function createWorker(name, processor, opts) {
    return new bullmq_1.Worker(name, processor, {
        connection: redisConfig(),
        concurrency: 5,
        ...opts,
    });
}
// ==================== Recipient Job Helpers ====================
async function enqueueRecipientJob(job) {
    if (!job.enqueuedAt) {
        job.enqueuedAt = new Date();
    }
    const queue = createQueue(exports.RECIPIENT_QUEUE);
    try {
        await queue.add('recipient', job, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: true,
            removeOnFail: false,
        });
    }
    finally {
        await queue.close();
    }
}
async function enqueueRecipientJobs(jobs) {
    if (jobs.length === 0)
        return;
    const now = new Date();
    for (const job of jobs) {
        if (!job.enqueuedAt) {
            job.enqueuedAt = now;
        }
    }
    const queue = createQueue(exports.RECIPIENT_QUEUE);
    try {
        await queue.addBulk(jobs.map(job => ({
            name: 'recipient',
            data: job,
            opts: {
                attempts: 3,
                backoff: { type: 'exponential', delay: 5000 },
            },
        })));
    }
    finally {
        await queue.close();
    }
}
//# sourceMappingURL=queue.js.map