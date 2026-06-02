import { PrismaClient } from '@prisma/client';
import { encryptField, decryptField } from './encryption-extension';
import { createPrismaClient, disconnectDatabase, testConnection } from './connection';
export declare const prisma: PrismaClient<import(".prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs> | import("@prisma/client/runtime/library").DynamicClientExtensionThis<import(".prisma/client").Prisma.TypeMap<import("@prisma/client/runtime/library").InternalArgs & {
    result: {
        [x: string]: {
            [x: string]: () => unknown;
        };
    };
    model: {
        [x: string]: {
            [x: string]: () => unknown;
        };
    };
    query: {
        [x: string]: {
            [x: string]: () => unknown;
        };
    };
    client: {
        [x: string]: () => unknown;
    };
}, import(".prisma/client").Prisma.PrismaClientOptions>, import(".prisma/client").Prisma.TypeMapCb, {
    result: {
        [x: string]: {
            [x: string]: () => unknown;
        };
    };
    model: {
        [x: string]: {
            [x: string]: () => unknown;
        };
    };
    query: {
        [x: string]: {
            [x: string]: () => unknown;
        };
    };
    client: {
        [x: string]: () => unknown;
    };
}, {}>;
export * from '@prisma/client';
export { encryptField, decryptField };
export { createPrismaClient, disconnectDatabase, testConnection };
export { getRedis, closeRedis, testRedisConnection, createRedisClient } from './redis';
export { getOrCreateContact, updateContactLastMessage, updateContactLastInbound, isServiceWindowOpen, normalizeContactPhone, formatPhoneWithCountryCode, } from './contact';
export { getTenantAwarePrisma } from './client';
export { organizationService } from './services/tenant.service';
export { BaseRepository } from './repositories/base.repository';
export { ContactRepository, contactRepository } from './repositories/contact.repository';
export type { RepositoryOptions } from './repositories/base.repository';
export type { ContactFilter } from './repositories/contact.repository';


