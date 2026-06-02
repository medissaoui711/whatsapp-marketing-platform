import { createStorage, StorageService, StorageConfig } from '@repo/storage';
import { randomUUID } from 'crypto';
import path from 'path';

let storageInstance: StorageService | null = null;

export function initStorage(config: StorageConfig): void {
  storageInstance = createStorage(config);
}

export function getStorage(): StorageService {
  if (!storageInstance) {
    throw new Error('Storage not initialized. Call initStorage first.');
  }
  return storageInstance;
}

export function generateMediaKey(
  organizationId: string,
  type: 'image' | 'video' | 'audio' | 'document' | 'campaign' | 'recording',
  filename: string
): string {
  const ext = path.extname(filename);
  const uniqueId = randomUUID();
  return `${organizationId}/${type}/${uniqueId}${ext}`;
}

export async function saveMedia(
  organizationId: string,
  type: 'image' | 'video' | 'audio' | 'document' | 'campaign' | 'recording',
  buffer: Buffer,
  filename: string,
  contentType: string,
  metadata?: Record<string, string>
): Promise<string> {
  const storage = getStorage();
  const key = generateMediaKey(organizationId, type, filename);

  await storage.upload(key, buffer, contentType, metadata);
  return key;
}

export async function getMediaUrl(key: string, expiresInSeconds?: number): Promise<string | null> {
  const storage = getStorage();

  if (typeof (storage as any).getPresignedUrl === 'function' && expiresInSeconds) {
    return (storage as any).getPresignedUrl(key, expiresInSeconds);
  }
  if (typeof (storage as any).getUrl === 'function') {
    return (storage as any).getUrl(key);
  }
  return null;
}

export async function deleteMedia(key: string): Promise<void> {
  const storage = getStorage();
  await storage.delete(key);
}

export async function mediaExists(key: string): Promise<boolean> {
  const storage = getStorage();
  return storage.exists(key);
}


