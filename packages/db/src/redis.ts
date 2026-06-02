import Redis from 'ioredis';

export interface RedisConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  db?: number;
  tls?: boolean;
}

let redisInstance: Redis | null = null;

export function createRedisClient(config?: RedisConfig): Redis {
  if (redisInstance) return redisInstance;

  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    redisInstance = new Redis(redisUrl);
  } else if (config) {
    const options: Record<string, unknown> = {
      host: config.host,
      port: config.port,
      db: config.db || 0,
    };

    if (config.username) options.username = config.username;
    if (config.password) options.password = config.password;
    if (config.tls) options.tls = { rejectUnauthorized: false };

    redisInstance = new Redis(options);
  } else {
    throw new Error('Redis configuration not provided');
  }

  return redisInstance;
}

export function getRedis(): Redis {
  if (!redisInstance) {
    return createRedisClient();
  }
  return redisInstance;
}

export async function closeRedis(): Promise<void> {
  if (redisInstance) {
    await redisInstance.quit();
    redisInstance = null;
  }
}

export async function testRedisConnection(): Promise<boolean> {
  try {
    const redis = getRedis();
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}


