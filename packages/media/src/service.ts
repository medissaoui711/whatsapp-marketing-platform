import { prisma } from '@repo/db';
import { WhatsAppClient } from '@repo/integrations';
import { decrypt } from '@repo/auth/encryption';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

const MEDIA_STORAGE_PATH = process.env.MEDIA_STORAGE_PATH || './media';

function getExtensionFromMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'video/mp4': '.mp4',
    'video/3gpp': '.3gp',
    'audio/aac': '.aac',
    'audio/mp4': '.m4a',
    'audio/mpeg': '.mp3',
    'audio/ogg': '.ogg',
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'text/plain': '.txt',
  };
  return map[mimeType] || '';
}

async function ensureDir(subdir: string): Promise<void> {
  await mkdir(join(MEDIA_STORAGE_PATH, subdir), { recursive: true });
}

export async function saveMediaLocally(
  data: Buffer,
  mimeType: string,
  filename: string,
): Promise<string> {
  let subdir = 'documents';
  if (mimeType.startsWith('image/')) subdir = 'images';
  else if (mimeType.startsWith('video/')) subdir = 'videos';
  else if (mimeType.startsWith('audio/')) subdir = 'audio';

  await ensureDir(subdir);

  const ext = getExtensionFromMimeType(mimeType) || '.bin';
  const newFilename = randomUUID() + ext;
  const filePath = join(MEDIA_STORAGE_PATH, subdir, newFilename);

  await writeFile(filePath, data);
  return join(subdir, newFilename);
}

export async function downloadAndSaveMedia(
  mediaId: string,
  mimeType: string,
  account: any,
): Promise<string> {
  const accessToken = decrypt(account.accessToken);
  const client = new WhatsAppClient();

  const waAccount = {
    phoneId: account.phoneId,
    businessId: account.businessId,
    apiVersion: account.apiVersion,
    accessToken,
  };

  const mediaUrl = await client.getMediaURL(waAccount, mediaId);
  const data = await client.downloadMedia(mediaUrl, accessToken);

  let filename = `media_${mediaId}`;
  const ext = getExtensionFromMimeType(mimeType);
  if (ext) filename += ext;

  return await saveMediaLocally(data, mimeType, filename);
}

export async function serveMedia(
  messageId: string,
  userId: string,
  orgId: string,
): Promise<{ data: Buffer; contentType: string } | null> {
  const message = await prisma.message.findFirst({
    where: { id: messageId, organizationId: orgId },
    include: { contact: true },
  });

  if (!message || !message.mediaUrl) return null;

  const user = await prisma.user.findFirst({
    where: { id: userId, organizationId: orgId, role: { in: ['owner', 'admin', 'super_admin'] } },
  });

  if (!user && message.contact?.assignedUserId !== userId) {
    const transfer = await prisma.agentTransfer.findFirst({
      where: {
        organizationId: orgId,
        contactId: message.contactId,
        status: 'active',
        teamId: { not: null },
      },
    });
    if (transfer?.teamId) {
      const member = await prisma.teamMember.findFirst({
        where: { teamId: transfer.teamId, userId },
      });
      if (!member) return null;
    } else {
      return null;
    }
  }

  const filePath = join(MEDIA_STORAGE_PATH, message.mediaUrl);
  const data = await readFile(filePath);

  const ext = message.mediaUrl.split('.').pop()?.toLowerCase() || '';
  const contentTypeMap: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', mp4: 'video/mp4',
    mp3: 'audio/mpeg', pdf: 'application/pdf',
  };

  return { data, contentType: contentTypeMap[ext] || 'application/octet-stream' };
}


