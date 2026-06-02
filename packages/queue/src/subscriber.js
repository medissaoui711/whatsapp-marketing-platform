"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Subscriber = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const CAMPAIGN_STATS_CHANNEL = 'whatomate:campaign_stats';
class Subscriber {
    constructor(redisUrl) {
        this.subscriber = null;
        const url = redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
        this.redis = new ioredis_1.default(url);
    }
    async subscribeCampaignStats(handler) {
        this.subscriber = this.redis.duplicate();
        await this.subscriber.subscribe(CAMPAIGN_STATS_CHANNEL);
        this.subscriber.on('message', (channel, message) => {
            if (channel === CAMPAIGN_STATS_CHANNEL) {
                try {
                    const update = JSON.parse(message);
                    handler(update);
                }
                catch (error) {
                    console.error('Failed to parse campaign stats update:', error);
                }
            }
        });
    }
    async close() {
        if (this.subscriber) {
            await this.subscriber.unsubscribe(CAMPAIGN_STATS_CHANNEL);
            await this.subscriber.quit();
        }
        await this.redis.quit();
    }
}
exports.Subscriber = Subscriber;
//# sourceMappingURL=subscriber.js.map