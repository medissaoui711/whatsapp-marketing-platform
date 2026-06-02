import { getCache } from './index';

export async function markPendingStickyCall(
  orgId: string,
  phone: string,
  agentId: string,
  ttlMinutes = 15,
): Promise<void> {
  const cache = getCache();
  const key = `vc_sticky:${orgId}:${phone}`;
  const ttlSeconds = ttlMinutes * 60;
  await cache.set(key, agentId, ttlSeconds);
}

export async function getPendingStickyCall(
  orgId: string,
  phone: string,
): Promise<string | null> {
  const cache = getCache();
  const key = `vc_sticky:${orgId}:${phone}`;
  return cache.get<string>(key);
}

export async function clearPendingStickyCall(orgId: string, phone: string): Promise<void> {
  const cache = getCache();
  const key = `vc_sticky:${orgId}:${phone}`;
  await cache.del(key);
}


