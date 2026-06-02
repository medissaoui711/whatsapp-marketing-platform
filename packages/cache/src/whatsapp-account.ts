import { getCache, CACHE_TTL, CACHE_PREFIX } from './index';
import { prisma } from '@repo/db';
import { decrypt } from '@repo/auth';

export interface WhatsAppAccountCache {
  id: string;
  organizationId: string;
  name: string;
  phoneId: string;
  businessId: string;
  appId?: string;
  apiVersion: string;
  accessToken: string;
  appSecret?: string;
  webhookVerifyToken?: string;
  isDefaultIncoming: boolean;
  isDefaultOutgoing: boolean;
  autoReadReceipt: boolean;
  businessCallingEnabled: boolean;
  status: string;
}

export async function getWhatsAppAccountCached(phoneId: string): Promise<WhatsAppAccountCache | null> {
  const cache = getCache();
  const cacheKey = `${CACHE_PREFIX.WHATSAPP_ACCOUNT}${phoneId}`;

  const cached = await cache.get<WhatsAppAccountCache>(cacheKey);
  if (cached) {
    if (cached.accessToken.startsWith('enc:')) {
      cached.accessToken = decrypt(cached.accessToken);
    }
    if (cached.appSecret?.startsWith('enc:')) {
      cached.appSecret = decrypt(cached.appSecret);
    }
    return cached;
  }

  const account = await prisma.whatsAppAccount.findFirst({
    where: { phoneId },
  });

  if (!account) return null;

  const cacheData: WhatsAppAccountCache = {
    id: account.id,
    organizationId: account.organizationId,
    name: account.name,
    phoneId: account.phoneId,
    businessId: account.businessId,
    appId: account.appId || undefined,
    apiVersion: account.apiVersion,
    accessToken: account.accessToken,
    appSecret: account.appSecret || undefined,
    webhookVerifyToken: account.webhookVerifyToken || undefined,
    isDefaultIncoming: account.isDefaultIncoming,
    isDefaultOutgoing: account.isDefaultOutgoing,
    autoReadReceipt: account.autoReadReceipt,
    businessCallingEnabled: account.businessCallingEnabled,
    status: account.status,
  };

  await cache.set(cacheKey, cacheData, CACHE_TTL.WHATSAPP_ACCOUNT);

  if (cacheData.accessToken.startsWith('enc:')) {
    cacheData.accessToken = decrypt(cacheData.accessToken);
  }
  if (cacheData.appSecret?.startsWith('enc:')) {
    cacheData.appSecret = decrypt(cacheData.appSecret);
  }

  return cacheData;
}

export async function invalidateWhatsAppAccountCache(phoneId: string): Promise<void> {
  const cache = getCache();
  const cacheKey = `${CACHE_PREFIX.WHATSAPP_ACCOUNT}${phoneId}`;
  await cache.del(cacheKey);
}


