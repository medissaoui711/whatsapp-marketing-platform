import { Job } from 'bullmq'
import { EmailJob } from '@repo/queue'
import { email } from '@repo/integrations'

export async function handleEmailJob(job: Job<EmailJob>) {
  const { to, subject, body } = job.data

  await email.send({
    to,
    subject,
    html: body,
  })
}


