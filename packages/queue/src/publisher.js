"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Publisher = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const CAMPAIGN_STATS_CHANNEL = 'whatomate:campaign_stats';
class Publisher {
    constructor(redisUrl) {
        this.redis = new ioredis_1.default(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
    }
    async publishCampaignStats(update) {
        const payload = JSON.stringify(update);
        await this.redis.publish(CAMPAIGN_STATS_CHANNEL, payload);
    }
    async close() {
        await this.redis.quit();
    }
}
exports.Publisher = Publisher;
//# sourceMappingURL=publisher.js.map