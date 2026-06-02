import { PrismaClient } from '@prisma/client';
import { getEncryptionExtension, encryptField, decryptField } from './encryption-extension';
import { getPrisma as getRawPrisma, createPrismaClient, disconnectDatabase, testConnection } from './connection';
import { initializeTenantMiddleware } from './client';

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createExtendedClient> | undefined
};

function createExtendedClient() {
  const base = getRawPrisma();
  const isEdgeRuntime = typeof (globalThis as Record<string, unknown>).EdgeRuntime === 'string';
  const extended = isEdgeRuntime ? base : base.$extends(getEncryptionExtension());

  initializeTenantMiddleware(extended as unknown as PrismaClient);

  return extended;
}

export const prisma = globalForPrisma.prisma ?? createExtendedClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export * from '@prisma/client'
export { encryptField, decryptField }
export { createPrismaClient, disconnectDatabase, testConnection }
export { getRedis, closeRedis, testRedisConnection, createRedisClient } from './redis'
export {
  getOrCreateContact,
  updateContactLastMessage,
  updateContactLastInbound,
  isServiceWindowOpen,
  normalizeContactPhone,
  formatPhoneWithCountryCode,
} from './contact'

export { getTenantAwarePrisma } from './client'
export { organizationService } from './services/tenant.service'
export { BaseRepository } from './repositories/base.repository'
export { ContactRepository, contactRepository } from './repositories/contact.repository'
export type { RepositoryOptions } from './repositories/base.repository'
export type { ContactFilter } from './repositories/contact.repository'


