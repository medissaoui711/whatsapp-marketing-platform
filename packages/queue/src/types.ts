export interface EmailJob {
  type: 'email'
  to: string
  subject: string
  body: string
}

export interface WebhookJob {
  type: 'webhook'
  url: string
  payload: Record<string, unknown>
  headers?: Record<string, string>
}

export interface NotificationJob {
  type: 'notification'
  userId: string
  title: string
  message: string
}

export interface BillingJob {
  type: 'billing'
  action: 'create_invoice' | 'process_payment' | 'handle_refund'
  data: Record<string, unknown>
}

export type JobData = EmailJob | WebhookJob | NotificationJob | BillingJob

// ==================== Campaign / WhatsApp Types ====================

export interface RecipientJob {
  campaignId: string
  recipientId: string
  organizationId: string
  phoneNumber: string
  recipientName: string
  templateParams: Record<string, unknown>
  headerParams: Record<string, unknown>
  enqueuedAt: Date
  retryCount?: number
  priority?: number
}

export interface WebhookDeliveryJob {
  webhookId: string
  organizationId: string
  event: string
  payload: any
  retryCount?: number
  maxRetries?: number
}

export interface ImportContactsJob {
  organizationId: string
  userId: string
  fileKey: string
  fileType: 'csv' | 'xlsx'
  mapping: Record<string, string>
  updateOnDuplicate: boolean
}

export interface ExportDataJob {
  organizationId: string
  userId: string
  table: string
  columns: string[]
  filters: Record<string, any>
  format: 'csv' | 'json'
}

export interface CampaignStatsUpdateJob {
  campaignId: string
  organizationId: string
  status: string
  sentCount: number
  deliveredCount: number
  readCount: number
  failedCount: number
}

export interface CleanupAuditLogsJob {
  organizationId: string
  olderThanDays: number
}

export interface ProcessRecordingJob {
  callLogId: string
  organizationId: string
  recordingKey: string
}

export interface JobResult {
  success: boolean
  message?: string
  data?: any
  error?: string
}

export interface CampaignStatsUpdate {
  campaignId: string
  organizationId: string
  status: 'draft' | 'scheduled' | 'queued' | 'processing' | 'paused' | 'completed' | 'cancelled' | 'failed'
  sentCount: number
  deliveredCount: number
  readCount: number
  failedCount: number
}

export interface JobHandler {
  handleRecipientJob(job: RecipientJob): Promise<void>
}


