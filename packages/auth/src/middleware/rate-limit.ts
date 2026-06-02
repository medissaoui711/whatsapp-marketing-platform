import { NextRequest, NextResponse } from 'next/server';
import type { Redis } from 'ioredis';
import { extractClientIP } from './ip-extractor';

export interface RateLimitOptions {
  redis: Redis;
  max: number;
  windowSeconds: number;
  keyPrefix: string;
  trustProxy?: boolean;
}

export interface UserAwareRateLimitOptions extends RateLimitOptions {
  getUserIdentifier?: (request: NextRequest) => string | null;
}

interface ApiRateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

type NextApiHandler<T = unknown> = (
  req: any,
  res: {
    status: (code: number) => { json: (data: T) => void };
    json: (data: T) => void;
    setHeader: (name: string, value: string) => void;
  },
) => Promise<void> | void;

interface ApiRateLimitOptions {
  windowMs: number;
  max: number;
  keyPrefix: string;
  redis?: Redis;
}

export function rateLimitMiddleware(options: RateLimitOptions) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    const ip = extractClientIP(request, options.trustProxy || false);
    const key = `ratelimit:${options.keyPrefix}:${ip}`;

    try {
      const count = await options.redis.incr(key);

      if (count === 1) {
        await options.redis.expire(key, options.windowSeconds);
      }

      if (count > options.max) {
        const ttl = await options.redis.ttl(key);
        const retryAfter = Math.max(1, ttl);

        const response = NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429 }
        );
        response.headers.set('Retry-After', String(retryAfter));
        return response;
      }

      return null;
    } catch (error) {
      console.error('Rate limit Redis error:', error);
      return null;
    }
  };
}

export function userAwareRateLimitMiddleware(options: UserAwareRateLimitOptions) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    let identity: string;

    if (options.getUserIdentifier) {
      const userId = options.getUserIdentifier(request);
      if (userId) {
        identity = `u:${userId}`;
      } else {
        const ip = extractClientIP(request, options.trustProxy || false);
        identity = `ip:${ip}`;
      }
    } else {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        identity = `token:${authHeader.substring(0, 20)}`;
      } else {
        const ip = extractClientIP(request, options.trustProxy || false);
        identity = `ip:${ip}`;
      }
    }

    const key = `ratelimit:${options.keyPrefix}:${identity}`;

    try {
      const count = await options.redis.incr(key);

      if (count === 1) {
        await options.redis.expire(key, options.windowSeconds);
      }

      if (count > options.max) {
        const ttl = await options.redis.ttl(key);
        const retryAfter = Math.max(1, ttl);

        const response = NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429 }
        );
        response.headers.set('Retry-After', String(retryAfter));
        return response;
      }

      return null;
    } catch (error) {
      console.error('Rate limit Redis error:', error);
      return null;
    }
  };
}

export function withRateLimit(handler: NextApiHandler, options: ApiRateLimitOptions): NextApiHandler {
  return async (req, res) => {
    const now = Date.now();
    const windowKey = `${options.keyPrefix}:${Math.floor(now / options.windowMs)}`;
    const key = `ratelimit:${windowKey}:${req.socket?.remoteAddress || 'unknown'}`;

    try {
      const result = (options.redis)
        ? await redisCheck(options.redis, key, options.max, options.windowMs)
        : inMemoryCheck(key, options.max, options.windowMs);

      if (!result.success) {
        res.setHeader('Retry-After', String(Math.ceil((result.resetAt - now) / 1000)));
        res.status(429).json({
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((result.resetAt - now) / 1000),
        });
        return;
      }

      return handler(req, res);
    } catch {
      return handler(req, res);
    }
  };
}

async function redisCheck(
  redis: Redis,
  key: string,
  max: number,
  windowMs: number,
): Promise<ApiRateLimitResult> {
  const windowSeconds = Math.ceil(windowMs / 1000);
  const now = Math.floor(Date.now() / 1000);
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, windowSeconds);
  }
  const resetAt = (Math.floor(now / windowSeconds) + 1) * windowSeconds * 1000;
  if (count > max) {
    return { success: false, remaining: 0, resetAt, limit: max };
  }
  return { success: true, remaining: max - count, resetAt, limit: max };
}

const inMemoryStore = new Map<string, { count: number; resetAt: number }>();

function inMemoryCheck(key: string, max: number, windowMs: number): ApiRateLimitResult {
  const now = Date.now();
  const record = inMemoryStore.get(key);
  if (!record || now > record.resetAt) {
    inMemoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: max - 1, resetAt: now + windowMs, limit: max };
  }
  if (record.count >= max) {
    return { success: false, remaining: 0, resetAt: record.resetAt, limit: max };
  }
  record.count++;
  return { success: true, remaining: max - record.count, resetAt: record.resetAt, limit: max };
}


