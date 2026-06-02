import { Queue, Worker, QueueOptions, WorkerOptions, Job } from 'bullmq'
import IORedis from 'ioredis'
import type { RecipientJob } from './types'

export const RECIPIENT_QUEUE = 'recipient-jobs'

function redisUrl(): string {
  return process.env.REDIS_URL || 'redis://localhost:6379'
}

function redisConfig() {
  return { url: redisUrl() }
}

let _redis: IORedis | null = null

function getRedis(): IORedis {
  if (!_redis) {
    _redis = new IORedis(redisUrl(), {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    })
  }
  return _redis
}

export const redis = new Proxy({} as IORedis, {
  get(_, prop) {
    return (getRedis() as any)[prop]
  },
})

export function createQueue(name: string, opts?: Partial<QueueOptions>) {
  return new Queue(name, {
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
  })
}

export function createWorker<T = unknown>(
  name: string,
  processor: (job: Job<T>) => Promise<void>,
  opts?: Partial<WorkerOptions>
) {
  return new Worker(name, processor, {
    connection: redisConfig(),
    concurrency: 5,
    ...opts,
  })
}

// ==================== Recipient Job Helpers ====================

export async function enqueueRecipientJob(job: RecipientJob): Promise<void> {
  if (!job.enqueuedAt) {
    job.enqueuedAt = new Date()
  }

  const queue = createQueue(RECIPIENT_QUEUE)
  try {
    await queue.add('recipient', job, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: false,
    })
  } finally {
    await queue.close()
  }
}

export async function enqueueRecipientJobs(jobs: RecipientJob[]): Promise<void> {
  if (jobs.length === 0) return

  const now = new Date()
  for (const job of jobs) {
    if (!job.enqueuedAt) {
      job.enqueuedAt = now
    }
  }

  const queue = createQueue(RECIPIENT_QUEUE)
  try {
    await queue.addBulk(
      jobs.map(job => ({
        name: 'recipient',
        data: job,
        opts: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      }))
    )
  } finally {
    await queue.close()
  }
}


