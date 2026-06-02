import type { Redis } from 'ioredis';

let redisClient: Redis | null = null;

export type RateLimitCheckResult = { allowed: true } | { allowed: false; retryAfterSeconds: number; resetAt: Date };

async function getRedisClient(): Promise<Redis | null> {
  if (redisClient) return redisClient;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;

  try {
    const { default: RedisImpl } = await import('ioredis');
    redisClient = new RedisImpl(redisUrl) as Redis;
    return redisClient;
  } catch (error) {
    console.error('Unable to initialize Redis client in rate-limit-helper:', error);
    return null;
  }
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
  redis?: Redis
): Promise<RateLimitCheckResult> {
  const client = redis || (await getRedisClient());
  if (!client) {
    return { allowed: true };
  }

  const now = Math.floor(Date.now() / 1000);
  const bucket = Math.floor(now / windowSeconds);
  const bucketKey = `ratelimit:${key}:${bucket}`;
  const ttlSeconds = bucket * windowSeconds + windowSeconds - now;

  const count = await client.incr(bucketKey);
  if (count === 1) {
    await client.expire(bucketKey, windowSeconds);
  }

  if (count > limit) {
    return { allowed: false, retryAfterSeconds: Math.max(1, ttlSeconds), resetAt: new Date((bucket + 1) * windowSeconds * 1000) };
  }

  return { allowed: true };
}

const DEFAULT_LOGIN_CONFIG = { limit: 5, windowSeconds: 300 };
const DEFAULT_REGISTER_CONFIG = { limit: 3, windowSeconds: 3600 };
const DEFAULT_API_CONFIG = { limit: 60, windowSeconds: 60 };

export async function rateLimitLogin(
  identifier: string,
  config?: { limit?: number; windowSeconds?: number },
  redis?: Redis
): Promise<RateLimitCheckResult> {
  const { limit, windowSeconds } = { ...DEFAULT_LOGIN_CONFIG, ...config };
  return checkRateLimit(`login:${identifier}`, limit, windowSeconds, redis);
}

export async function rateLimitRegister(
  identifier: string,
  config?: { limit?: number; windowSeconds?: number },
  redis?: Redis
): Promise<RateLimitCheckResult> {
  const { limit, windowSeconds } = { ...DEFAULT_REGISTER_CONFIG, ...config };
  return checkRateLimit(`register:${identifier}`, limit, windowSeconds, redis);
}

export async function rateLimitAPI(
  key: string,
  config?: { limit?: number; windowSeconds?: number },
  redis?: Redis
): Promise<RateLimitCheckResult> {
  const { limit, windowSeconds } = { ...DEFAULT_API_CONFIG, ...config };
  return checkRateLimit(`api:${key}`, limit, windowSeconds, redis);
}


