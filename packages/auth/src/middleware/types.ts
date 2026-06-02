import type { IncomingMessage } from 'http';
import type { Redis } from 'ioredis';

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyPrefix: string;
  redis?: Redis;
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  limit: number;
  resetAt: number;
}

export interface RateLimitConfig {
  login: RateLimitOptions;
  register: RateLimitOptions;
  api: RateLimitOptions;
  search: RateLimitOptions;
}

export type NextApiHandler<T = unknown> = (
  req: IncomingMessage & { cookies?: Record<string, string> },
  res: {
    status: (code: number) => { json: (data: T) => void };
    json: (data: T) => void;
    setHeader: (name: string, value: string) => void;
  }
) => Promise<void> | void;


