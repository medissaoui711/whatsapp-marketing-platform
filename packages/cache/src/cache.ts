import Redis from 'ioredis';
import { CACHE_TTL, CACHE_PREFIX } from './constants';

export class CacheService {
  private redis: Redis;
  private isConnected = false;

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl);

    this.redis.on('connect', () => {
      this.isConnected = true;
    });

    this.redis.on('error', (error) => {
      console.error('Redis error:', error);
      this.isConnected = false;
    });
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) return null;

    try {
      const data = await this.redis.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      console.error(`Failed to get cache key ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl: number): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttl);
      return true;
    } catch (error) {
      console.error(`Failed to set cache key ${key}:`, error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error(`Failed to delete cache key ${key}:`, error);
      return false;
    }
  }

  async deleteByPattern(pattern: string): Promise<number> {
    if (!this.isConnected) return 0;

    try {
      let deletedCount = 0;
      let cursor = '0';

      do {
        const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;

        if (keys.length > 0) {
          deletedCount += await this.redis.del(...keys);
        }
      } while (cursor !== '0');

      return deletedCount;
    } catch (error) {
      console.error(`Failed to delete keys by pattern ${pattern}:`, error);
      return 0;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isConnected) return false;

    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Failed to check existence of key ${key}:`, error);
      return false;
    }
  }

  async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T | null>,
    ttl: number,
  ): Promise<T | null> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const fresh = await fetchFn();
    if (fresh !== null) {
      await this.set(key, fresh, ttl);
    }
    return fresh;
  }

  async getMany<T>(keys: string[]): Promise<(T | null)[]> {
    if (!this.isConnected || keys.length === 0) return keys.map(() => null);

    try {
      const values = await this.redis.mget(keys);
      return values.map((v) => (v ? (JSON.parse(v) as T) : null));
    } catch (error) {
      console.error('Failed to mget cache keys:', error);
      return keys.map(() => null);
    }
  }

  async setMany<T>(entries: { key: string; value: T; ttl?: number }[]): Promise<boolean> {
    if (!this.isConnected || entries.length === 0) return false;

    try {
      const pipeline = this.redis.pipeline();
      for (const { key, value, ttl } of entries) {
        const serialized = JSON.stringify(value);
        if (ttl) {
          pipeline.set(key, serialized, 'EX', ttl);
        } else {
          pipeline.set(key, serialized);
        }
      }
      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Failed to mset cache keys:', error);
      return false;
    }
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }

  isReady(): boolean {
    return this.isConnected;
  }
}

let cacheInstance: CacheService | null = null;

export function getCache(): CacheService {
  if (!cacheInstance) {
    cacheInstance = new CacheService(process.env.REDIS_URL || 'redis://localhost:6379');
  }
  return cacheInstance;
}


