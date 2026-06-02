import Redis from 'ioredis'
import type { CampaignStatsUpdate } from './types'

const CAMPAIGN_STATS_CHANNEL = 'whatomate:campaign_stats'

export class Publisher {
  private redis: Redis

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379')
  }

  async publishCampaignStats(update: CampaignStatsUpdate): Promise<void> {
    const payload = JSON.stringify(update)
    await this.redis.publish(CAMPAIGN_STATS_CHANNEL, payload)
  }

  async close(): Promise<void> {
    await this.redis.quit()
  }
}


