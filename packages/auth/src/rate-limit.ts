let redisClient: any = null;

export async function initRateLimiter(redisUrl?: string): Promise<any> {
  if (redisClient) return redisClient;
  if (!process.env.REDIS_URL && !redisUrl) return null;

  try {
    const { default: Redis } = await import('ioredis');
    redisClient = new Redis(redisUrl || process.env.REDIS_URL!);
    return redisClient;
  } catch {
    return null;
  }
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

export async function rateLimit(
  key: string,
  limit: number = 60,
  windowMs: number = 60 * 1000
): Promise<RateLimitResult> {
  const redis = await initRateLimiter();

  if (redis) {
    return redisRateLimit(redis, key, limit, windowMs);
  }

  return inMemoryRateLimit(key, limit, windowMs);
}

async function redisRateLimit(
  redis: any,
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const windowSeconds = Math.ceil(windowMs / 1000);
  const now = Math.floor(Date.now() / 1000);
  const windowKey = `rate_limit:${key}:${Math.floor(now / windowSeconds)}`;

  const count = await redis.incr(windowKey);

  if (count === 1) {
    await redis.expire(windowKey, windowSeconds);
  }

  const resetAt = (Math.floor(now / windowSeconds) + 1) * windowSeconds * 1000;

  if (count > limit) {
    return { success: false, remaining: 0, resetAt, limit };
  }

  return { success: true, remaining: limit - count, resetAt, limit };
}

const memoryStore = new Map<string, { count: number; resetAt: number }>();

function inMemoryRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const record = memoryStore.get(key);

  if (!record || now > record.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, resetAt: now + windowMs, limit };
  }

  if (record.count >= limit) {
    return { success: false, remaining: 0, resetAt: record.resetAt, limit };
  }

  record.count++;
  memoryStore.set(key, record);
  return { success: true, remaining: limit - record.count, resetAt: record.resetAt, limit };
}


