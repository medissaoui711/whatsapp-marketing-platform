import { SendEmailParams, EmailConfig } from './types'

let config: EmailConfig | null = null

export function configureEmail(cfg: EmailConfig) {
  config = cfg
}

export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  if (!config) {
    console.warn('Email not configured. Skipping send.')
    return false
  }

  console.log(`[Email] Sending to: ${params.to}, Subject: ${params.subject}`)
  return true
}

export const email = {
  send: sendEmail,
  configure: configureEmail,
}


