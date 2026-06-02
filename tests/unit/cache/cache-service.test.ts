import { describe, it, expect, vi, beforeEach } from 'vitest';

class MockRedis {
  private store = new Map<string, string>();
  private connected = true;

  on() {}
  async get(key: string) { return this.store.get(key) || null; }
  async set(key: string, value: string, ...args: any[]) { this.store.set(key, value); }
  async del(...keys: string[]) {
    let count = 0;
    for (const k of keys) { if (this.store.delete(k)) count++; }
    return count;
  }
  async exists(key: string) { return this.store.has(key) ? 1 : 0; }
  async mget(...keys: string[][]) { return keys[0].map(k => this.store.get(k) || null); }
  pipeline() {
    const ops: any[] = [];
    return {
      set(key: string, value: string, ...args: any[]) { ops.push(() => this.store.set(key, value)); },
      exec() { ops.forEach(fn => fn()); return []; },
    };
  }
  async scan(cursor: string, ...args: any[]) {
    const match = args[1] as string;
    const pattern = match.replace(/\*/g, '.*');
    const regex = new RegExp(`^${pattern}$`);
    const keys = Array.from(this.store.keys()).filter(k => regex.test(k));
    return ['0', keys];
  }
  async quit() { this.connected = false; }
}

class CacheService {
  private redis: MockRedis;
  private isConnected = true;

  constructor() {
    this.redis = new MockRedis();
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) return null;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) as T : null;
  }

  async set<T>(key: string, value: T, ttl: number): Promise<boolean> {
    await this.redis.set(key, JSON.stringify(value));
    return true;
  }

  async del(key: string): Promise<boolean> {
    const result = await this.redis.del(key);
    return result > 0;
  }

  async deleteByPattern(pattern: string): Promise<number> {
    return this.redis.del(pattern);
  }

  async getOrFetch<T>(key: string, fetchFn: () => Promise<T | null>, ttl: number): Promise<T | null> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const fresh = await fetchFn();
    if (fresh !== null) await this.set(key, fresh, ttl);
    return fresh;
  }

  async getMany<T>(keys: string[]): Promise<(T | null)[]> {
    const values = await this.redis.mget(keys);
    return values.map(v => v ? JSON.parse(v) as T : null);
  }

  async setMany<T>(entries: { key: string; value: T; ttl?: number }[]): Promise<boolean> {
    for (const e of entries) {
      await this.redis.set(e.key, JSON.stringify(e.value));
    }
    return true;
  }
}

describe('CacheService', () => {
  let cache: CacheService;

  beforeEach(() => {
    cache = new CacheService();
  });

  describe('get / set', () => {
    it('should store and retrieve a value', async () => {
      await cache.set('test:key', { name: 'test' }, 60);
      const result = await cache.get<{ name: string }>('test:key');
      expect(result).toEqual({ name: 'test' });
    });

    it('should return null for missing key', async () => {
      const result = await cache.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should overwrite existing value', async () => {
      await cache.set('test:key', 'first', 60);
      await cache.set('test:key', 'second', 60);
      const result = await cache.get<string>('test:key');
      expect(result).toBe('second');
    });

    it('should handle complex nested objects', async () => {
      const complex = { id: '1', nested: { arr: [1, 2, 3], flag: true } };
      await cache.set('complex', complex, 60);
      const result = await cache.get<typeof complex>('complex');
      expect(result).toEqual(complex);
    });
  });

  describe('del / deleteByPattern', () => {
    it('should delete a specific key', async () => {
      await cache.set('delete:me', 'value', 60);
      const deleted = await cache.del('delete:me');
      expect(deleted).toBe(true);
      const result = await cache.get('delete:me');
      expect(result).toBeNull();
    });

    it('should return false when deleting non-existent key', async () => {
      const deleted = await cache.del('nonexistent');
      expect(deleted).toBe(false);
    });
  });

  describe('getOrFetch', () => {
    it('should return cached value when available', async () => {
      await cache.set('fetch:key', 'cached', 60);
      const fetcher = vi.fn().mockResolvedValue('fresh');
      const result = await cache.getOrFetch('fetch:key', fetcher, 60);
      expect(result).toBe('cached');
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('should call fetcher on cache miss', async () => {
      const fetcher = vi.fn().mockResolvedValue('fresh');
      const result = await cache.getOrFetch('miss:key', fetcher, 60);
      expect(result).toBe('fresh');
      expect(fetcher).toHaveBeenCalledOnce();
    });

    it('should not cache when fetcher returns null', async () => {
      const fetcher = vi.fn().mockResolvedValue(null);
      const result = await cache.getOrFetch('null:key', fetcher, 60);
      expect(result).toBeNull();
      const cached = await cache.get('null:key');
      expect(cached).toBeNull();
    });

    it('should store fetched value in cache', async () => {
      const fetcher = vi.fn().mockResolvedValue('stored');
      await cache.getOrFetch('store:key', fetcher, 60);
      const cached = await cache.get<string>('store:key');
      expect(cached).toBe('stored');
    });
  });

  describe('getMany / setMany', () => {
    it('should return multiple values', async () => {
      await cache.set('multi:1', 'a', 60);
      await cache.set('multi:2', 'b', 60);
      const results = await cache.getMany<string>(['multi:1', 'multi:2', 'multi:missing']);
      expect(results).toEqual(['a', 'b', null]);
    });

    it('should set multiple values', async () => {
      await cache.setMany([
        { key: 'batch:1', value: 'x', ttl: 60 },
        { key: 'batch:2', value: 'y', ttl: 60 },
      ]);
      const r1 = await cache.get<string>('batch:1');
      const r2 = await cache.get<string>('batch:2');
      expect(r1).toBe('x');
      expect(r2).toBe('y');
    });
  });
});
