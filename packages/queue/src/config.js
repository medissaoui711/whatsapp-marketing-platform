"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JOB_PRIORITIES = exports.DEFAULT_JOB_OPTIONS = exports.QUEUE_NAMES = void 0;
exports.createQueueConfig = createQueueConfig;
exports.createWorkerConfig = createWorkerConfig;
exports.getRedisConnection = getRedisConnection;
const ioredis_1 = __importDefault(require("ioredis"));
exports.QUEUE_NAMES = {
    RECIPIENT: 'recipient-jobs',
    WEBHOOK: 'webhook-jobs',
    IMPORT: 'import-jobs',
    EXPORT: 'export-jobs',
    CAMPAIGN_STATS: 'campaign-stats-jobs',
    MAINTENANCE: 'maintenance-jobs',
    RECORDING: 'recording-jobs',
};
exports.DEFAULT_JOB_OPTIONS = {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 500,
    timeout: 30000,
};
exports.JOB_PRIORITIES = {
    HIGH: 1,
    NORMAL: 5,
    LOW: 10,
};
function createQueueConfig(config) {
    return {
        connection: { url: config.redisUrl },
        prefix: config.prefix || 'whatomate',
        defaultJobOptions: { ...exports.DEFAULT_JOB_OPTIONS, ...config.defaultJobOptions },
    };
}
function createWorkerConfig(config) {
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
let redisConnection = null;
function getRedisConnection() {
    if (!redisConnection) {
        redisConnection = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379');
    }
    return redisConnection;
}
//# sourceMappingURL=config.js.map