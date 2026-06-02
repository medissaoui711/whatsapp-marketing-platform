jest.mock('ioredis', () => {
  const mockPublish = jest.fn().mockResolvedValue(1)
  const mockSubscribe = jest.fn().mockResolvedValue(undefined)
  const mockUnsubscribe = jest.fn().mockResolvedValue(undefined)
  const mockQuit = jest.fn().mockResolvedValue(undefined)
  const mockOn = jest.fn()
  const mockDuplicate = jest.fn().mockReturnValue({
    subscribe: mockSubscribe,
    unsubscribe: mockUnsubscribe,
    quit: mockQuit,
    on: mockOn,
  })

  return jest.fn().mockImplementation(() => ({
    publish: mockPublish,
    subscribe: mockSubscribe,
    unsubscribe: mockUnsubscribe,
    quit: mockQuit,
    on: mockOn,
    duplicate: mockDuplicate,
  }))
})

import { Publisher } from '../publisher'
import { Subscriber } from '../subscriber'
import type { RecipientJob, CampaignStatsUpdate, JobHandler } from '../types'
import { randomUUID } from 'crypto'

describe('Queue System', () => {
  describe('Publisher / Subscriber', () => {
    it('should publish campaign stats via redis', async () => {
      const publisher = new Publisher()
      const update: CampaignStatsUpdate = {
        campaignId: randomUUID(),
        organizationId: randomUUID(),
        status: 'processing',
        sentCount: 10,
        deliveredCount: 8,
        readCount: 5,
        failedCount: 2,
      }

      await publisher.publishCampaignStats(update)

      const ioredis = require('ioredis')
      const mockInstance = ioredis.mock.results[0].value
      expect(mockInstance.publish).toHaveBeenCalledWith(
        'whatomate:campaign_stats',
        JSON.stringify(update)
      )

      await publisher.close()
    })

    it('should subscribe and receive campaign stats', async () => {
      const subscriber = new Subscriber()

      const receivedPromise = new Promise<CampaignStatsUpdate>((resolve) => {
        subscriber.subscribeCampaignStats((received) => {
          resolve(received)
        })
      })

      // Wait for subscribe to complete, then simulate message
      await new Promise(process.nextTick)

      const ioredis = require('ioredis')
      const mockInstance = ioredis.mock.results[0].value
      const dupInstance = mockInstance.duplicate.mock.results[0].value

      const msgHandler = dupInstance.on.mock.calls.find((c: string[]) => c[0] === 'message')?.[1]
      expect(msgHandler).toBeDefined()

      const update: CampaignStatsUpdate = {
        campaignId: randomUUID(),
        organizationId: randomUUID(),
        status: 'processing',
        sentCount: 5,
        deliveredCount: 3,
        readCount: 1,
        failedCount: 0,
      }
      msgHandler!('whatomate:campaign_stats', JSON.stringify(update))

      const received = await receivedPromise
      expect(received.campaignId).toBe(update.campaignId)
      expect(received.sentCount).toBe(5)

      await subscriber.close()
    })

    it('should close without error', async () => {
      const subscriber = new Subscriber()
      const publisher = new Publisher()
      await expect(subscriber.close()).resolves.not.toThrow()
      await expect(publisher.close()).resolves.not.toThrow()
    })

    it('should subscribe to the correct channel', async () => {
      const subscriber = new Subscriber()
      const handler = jest.fn()
      await subscriber.subscribeCampaignStats(handler)

      const ioredis = require('ioredis')
      const mockInstance = ioredis.mock.results[0].value
      const dupInstance = mockInstance.duplicate.mock.results[0].value
      expect(dupInstance.subscribe).toHaveBeenCalledWith('whatomate:campaign_stats')

      await subscriber.close()
    })
  })

  describe('RecipientJob type', () => {
    it('should create a valid RecipientJob', () => {
      const job: RecipientJob = {
        campaignId: 'camp-1',
        recipientId: 'rec-1',
        organizationId: 'org-1',
        phoneNumber: '+1234567890',
        recipientName: 'John Doe',
        templateParams: { name: 'John' },
        headerParams: {},
        enqueuedAt: new Date(),
      }
      expect(job.campaignId).toBe('camp-1')
      expect(job.recipientName).toBe('John Doe')
      expect(job.templateParams).toEqual({ name: 'John' })
    })
  })

  describe('CampaignStatsUpdate type', () => {
    it('should create a valid CampaignStatsUpdate', () => {
      const update: CampaignStatsUpdate = {
        campaignId: 'camp-1',
        organizationId: 'org-1',
        status: 'processing',
        sentCount: 100,
        deliveredCount: 90,
        readCount: 50,
        failedCount: 5,
      }
      expect(update.status).toBe('processing')
      expect(update.sentCount).toBe(100)
    })

    it('should accept all valid statuses', () => {
      const statuses: CampaignStatsUpdate['status'][] = [
        'draft', 'scheduled', 'queued', 'processing',
        'paused', 'completed', 'cancelled', 'failed',
      ]

      for (const status of statuses) {
        const update: CampaignStatsUpdate = {
          campaignId: 'c',
          organizationId: 'o',
          status,
          sentCount: 0,
          deliveredCount: 0,
          readCount: 0,
          failedCount: 0,
        }
        expect(update.status).toBe(status)
      }
    })
  })

  describe('JobHandler type', () => {
    it('should accept a class implementing JobHandler', () => {
      class MyHandler implements JobHandler {
        async handleRecipientJob(job: RecipientJob): Promise<void> {
          // noop
        }
      }

      const handler = new MyHandler()
      expect(handler).toBeDefined()
      expect(typeof handler.handleRecipientJob).toBe('function')
    })
  })
})


