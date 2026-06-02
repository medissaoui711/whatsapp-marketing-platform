import { PrismaClient } from '@prisma/client';
import { encryptField, decryptField } from './encryption-extension';
import { createPrismaClient, disconnectDatabase, testConnection } from './connection';
export declare const prisma: PrismaClient<import(".prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
export * from '@prisma/client';
export { encryptField, decryptField };
export declare const getTenantAwarePrisma: () => PrismaClient<import(".prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
export { createPrismaClient, disconnectDatabase, testConnection };
export { getRedis, closeRedis, testRedisConnection, createRedisClient } from './redis';
export { getOrCreateContact, updateContactLastMessage, updateContactLastInbound, isServiceWindowOpen, normalizeContactPhone, formatPhoneWithCountryCode, } from './contact';
export { organizationService } from './services/tenant.service';
export { BaseRepository } from './repositories/base.repository';
export { ContactRepository, contactRepository } from './repositories/contact.repository';
export type { RepositoryOptions } from './repositories/base.repository';
export type { ContactFilter } from './repositories/contact.repository';
//# sourceMappingURL=index.d.ts.map