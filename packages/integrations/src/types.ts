export interface EmailConfig {
  host: string
  port: number
  user: string
  pass: string
  from: string
}

export interface StorageConfig {
  provider: 's3' | 'local'
  bucket?: string
  region?: string
  endpoint?: string
  accessKeyId?: string
  secretAccessKey?: string
}

export interface SendEmailParams {
  to: string | string[]
  subject: string
  html: string
  text?: string
  cc?: string | string[]
  bcc?: string | string[]
}

export interface UploadResult {
  url: string
  key: string
  size: number
  mimeType: string
}


