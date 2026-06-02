import { PrismaClient } from '@prisma/client';
export interface DatabaseConfig {
    host: string;
    port: number;
    user: string;
    password: string;
    name: string;
    sslMode?: string;
    maxOpenConns?: number;
    maxIdleConns?: number;
    connMaxLifetime?: number;
}
export declare function createPrismaClient(config?: DatabaseConfig): PrismaClient;
export declare function getPrisma(): PrismaClient;
export declare function disconnectDatabase(): Promise<void>;
export declare function testConnection(): Promise<boolean>;


