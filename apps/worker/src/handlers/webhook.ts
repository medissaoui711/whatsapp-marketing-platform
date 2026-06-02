import { Job } from 'bullmq'
import { WebhookJob } from '@repo/queue'

export async function handleWebhookJob(job: Job<WebhookJob>) {
  const { url, payload, headers } = job.data

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Webhook failed with status ${response.status}`)
  }
}


