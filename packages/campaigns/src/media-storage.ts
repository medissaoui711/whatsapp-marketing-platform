import { getStorage, saveMedia, getMediaUrl, deleteMedia } from '@repo/media';
import { randomUUID } from 'crypto';

export interface CampaignMediaMetadata {
  campaignId: string;
  templateId: string;
  mimeType: string;
  originalFilename: string;
}

export async function saveCampaignMedia(
  organizationId: string,
  campaignId: string,
  templateId: string,
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<{ key: string; mediaId: string }> {
  const key = await saveMedia(
    organizationId,
    'campaign',
    buffer,
    filename,
    mimeType,
    {
      campaignId,
      templateId,
      originalFilename: filename,
    }
  );

  const mediaId = randomUUID();
  return { key, mediaId };
}

export async function getCampaignMediaUrl(key: string): Promise<string | null> {
  return getMediaUrl(key, 3600);
}

export async function deleteCampaignMedia(key: string): Promise<void> {
  return deleteMedia(key);
}


