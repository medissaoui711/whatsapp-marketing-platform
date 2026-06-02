"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRedisClient = createRedisClient;
exports.getRedis = getRedis;
exports.closeRedis = closeRedis;
exports.testRedisConnection = testRedisConnection;
const ioredis_1 = __importDefault(require("ioredis"));
let redisInstance = null;
function createRedisClient(config) {
    if (redisInstance)
        return redisInstance;
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
        redisInstance = new ioredis_1.default(redisUrl);
    }
    else if (config) {
        const options = {
            host: config.host,
            port: config.port,
            db: config.db || 0,
        };
        if (config.username)
            options.username = config.username;
        if (config.password)
            options.password = config.password;
        if (config.tls)
            options.tls = { rejectUnauthorized: false };
        redisInstance = new ioredis_1.default(options);
    }
    else {
        throw new Error('Redis configuration not provided');
    }
    return redisInstance;
}
function getRedis() {
    if (!redisInstance) {
        return createRedisClient();
    }
    return redisInstance;
}
async function closeRedis() {
    if (redisInstance) {
        await redisInstance.quit();
        redisInstance = null;
    }
}
async function testRedisConnection() {
    try {
        const redis = getRedis();
        await redis.ping();
        return true;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=redis.js.map