import { getCache, CACHE_TTL, CACHE_PREFIX } from './index';
import { prisma } from '@repo/db';
import type { UserResponse } from '@repo/shared';

export async function getUserProfileCached(userId: string, tenantId: string): Promise<UserResponse | null> {
  const cache = getCache();
  const cacheKey = `${CACHE_PREFIX.USER_PROFILE}${userId}:${tenantId}`;

  const cached = await cache.get<UserResponse>(cacheKey);
  if (cached) return cached;

  return null;
}

export async function setUserProfileCache(
  userId: string,
  tenantId: string,
  profile: UserResponse,
): Promise<void> {
  const cache = getCache();
  const cacheKey = `${CACHE_PREFIX.USER_PROFILE}${userId}:${tenantId}`;
  await cache.set(cacheKey, profile, CACHE_TTL.USER_PROFILE);
}

export async function invalidateUserProfileCache(userId: string, tenantId: string): Promise<void> {
  const cache = getCache();
  await cache.del(`${CACHE_PREFIX.USER_PROFILE}${userId}:${tenantId}`);
}

export async function invalidateAllUserProfileCache(userId: string): Promise<void> {
  const cache = getCache();
  await cache.deleteByPattern(`${CACHE_PREFIX.USER_PROFILE}${userId}:*`);
}
