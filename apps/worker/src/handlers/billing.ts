import { Job } from 'bullmq'
import { BillingJob } from '@repo/queue'

export async function handleBillingJob(job: Job<BillingJob>) {
  const { action, data } = job.data

  switch (action) {
    case 'create_invoice':
      console.log('[Billing] Creating invoice:', data)
      break
    case 'process_payment':
      console.log('[Billing] Processing payment:', data)
      break
    case 'handle_refund':
      console.log('[Billing] Handling refund:', data)
      break
    default:
      console.warn('[Billing] Unknown action:', action)
  }
}


