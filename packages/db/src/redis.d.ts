import Redis from 'ioredis';
export interface RedisConfig {
    host: string;
    port: number;
    username?: string;
    password?: string;
    db?: number;
    tls?: boolean;
}
export declare function createRedisClient(config?: RedisConfig): Redis;
export declare function getRedis(): Redis;
export declare function closeRedis(): Promise<void>;
export declare function testRedisConnection(): Promise<boolean>;
//# sourceMappingURL=redis.d.ts.map