import { StorageConfig, UploadResult } from './types'

let config: StorageConfig | null = null

export function configureStorage(cfg: StorageConfig) {
  config = cfg
}

export async function uploadFile(
  key: string,
  buffer: Buffer,
  mimeType: string
): Promise<UploadResult> {
  if (!config) {
    throw new Error('Storage not configured')
  }

  return {
    url: `/uploads/${key}`,
    key,
    size: buffer.length,
    mimeType,
  }
}

export async function deleteFile(key: string): Promise<boolean> {
  console.log(`[Storage] Deleting: ${key}`)
  return true
}

export const storage = {
  upload: uploadFile,
  delete: deleteFile,
  configure: configureStorage,
}


