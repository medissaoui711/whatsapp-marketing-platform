import { getStorage, saveMedia, getMediaUrl, deleteMedia } from '@repo/media';

export interface RecordingMetadata {
  callId: string;
  organizationId: string;
  agentId?: string;
  contactId?: string;
  duration: number;
  startedAt: Date;
  endedAt: Date;
}

export async function saveCallRecording(
  organizationId: string,
  callId: string,
  audioBuffer: Buffer,
  duration: number,
  metadata: Omit<RecordingMetadata, 'callId' | 'duration'>
): Promise<string> {
  const filename = `${callId}.opus`;
  const key = await saveMedia(
    organizationId,
    'recording',
    audioBuffer,
    filename,
    'audio/opus',
    {
      callId,
      duration: String(duration),
      startedAt: metadata.startedAt.toISOString(),
      endedAt: metadata.endedAt.toISOString(),
      agentId: metadata.agentId || '',
      contactId: metadata.contactId || '',
    }
  );

  return key;
}

export async function getCallRecordingUrl(
  key: string,
  expiresInSeconds: number = 3600
): Promise<string | null> {
  return getMediaUrl(key, expiresInSeconds);
}

export async function deleteCallRecording(key: string): Promise<void> {
  return deleteMedia(key);
}

export async function getCallRecordingMetadata(key: string): Promise<Record<string, string> | null> {
  const storage = getStorage();
  const result = await storage.head(key);

  if (!result.exists) {
    return null;
  }

  return { contentType: result.contentType || '', size: String(result.size || 0) };
}


