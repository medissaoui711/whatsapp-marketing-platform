import Redis from 'ioredis'
import type { CampaignStatsUpdate } from './types'

const CAMPAIGN_STATS_CHANNEL = 'whatomate:campaign_stats'

export class Subscriber {
  private redis: Redis
  private subscriber: Redis | null = null

  constructor(redisUrl?: string) {
    const url = redisUrl || process.env.REDIS_URL || 'redis://localhost:6379'
    this.redis = new Redis(url)
  }

  async subscribeCampaignStats(handler: (update: CampaignStatsUpdate) => void): Promise<void> {
    this.subscriber = this.redis.duplicate()
    await this.subscriber.subscribe(CAMPAIGN_STATS_CHANNEL)

    this.subscriber.on('message', (channel: string, message: string) => {
      if (channel === CAMPAIGN_STATS_CHANNEL) {
        try {
          const update = JSON.parse(message) as CampaignStatsUpdate
          handler(update)
        } catch (error) {
          console.error('Failed to parse campaign stats update:', error)
        }
      }
    })
  }

  async close(): Promise<void> {
    if (this.subscriber) {
      await this.subscriber.unsubscribe(CAMPAIGN_STATS_CHANNEL)
      await this.subscriber.quit()
    }
    await this.redis.quit()
  }
}


