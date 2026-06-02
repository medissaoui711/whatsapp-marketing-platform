import { Job } from 'bullmq'
import { NotificationJob } from '@repo/queue'

export async function handleNotificationJob(job: Job<NotificationJob>) {
  const { userId, title, message } = job.data

  console.log(`[Notification] User ${userId}: ${title} - ${message}`)
}


