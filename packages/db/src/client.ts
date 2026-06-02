import { PrismaClient, Prisma } from '@prisma/client';

type PrismaAction =
  | 'findUnique' | 'findFirst' | 'findMany'
  | 'create' | 'createMany'
  | 'update' | 'upsert'
  | 'delete'
  | 'aggregate' | 'groupBy' | 'count';

interface PrismaParams extends Prisma.MiddlewareParams {
  action: PrismaAction;
  args: any;
  context?: Record<string, unknown>;
}

const skipModels = ['Organization', 'Permission'];
const tenantIdModels = ['Session', 'RefreshToken'];
const orgIdModels = ['UserOrganization', 'RolePermission', 'WebhookDeliveryLog', 'BulkMessageRecipient', 'CatalogProduct'];

function isModelSkipped(model: string | undefined): boolean {
  return !model || skipModels.includes(model);
}

function getTenantField(model: string | undefined): string {
  if (!model) return 'organizationId';
  if (tenantIdModels.includes(model)) return 'tenantId';
  return orgIdModels.includes(model) ? 'organizationId' : 'organizationId';
}

const globalForPrisma = globalThis as unknown as {
  tenantMiddlewareInstalled?: boolean;
};

export function initializeTenantMiddleware(prisma: PrismaClient) {
  if (globalForPrisma.tenantMiddlewareInstalled) return;

  prisma.$use(async (params: Prisma.MiddlewareParams, next: Prisma.MiddlewareNext) => {
    const organizationId = params.context?.organizationId as string | undefined;
    const isSuperAdmin = params.context?.isSuperAdmin === true;

    if (!organizationId || isModelSkipped(params.model) || isSuperAdmin) {
      return next(params);
    }

    const field = params.model === 'Organization' ? 'id' : getTenantField(params.model);
    const args = params.args ?? {};

    switch (params.action) {
      case 'findUnique':
      case 'findFirst':
        if (!args.where) args.where = {};
        if (!args.where[field]) {
          args.where[field] = organizationId;
        }
        break;
      case 'findMany':
      case 'aggregate':
      case 'groupBy':
      case 'count':
        if (!args.where) args.where = {};
        if (!args.where[field]) {
          args.where[field] = organizationId;
        }
        break;
      case 'create':
        if (args.data && !args.data[field]) {
          args.data[field] = organizationId;
        }
        break;
      case 'createMany':
        if (Array.isArray(args.data)) {
          for (const item of args.data) {
            if (!item[field]) item[field] = organizationId;
          }
        }
        break;
      case 'update':
      case 'upsert':
      case 'delete':
        if (!args.where) args.where = {};
        if (!args.where[field]) {
          args.where[field] = organizationId;
        }
        break;
    }

    return next(params);
  });

  globalForPrisma.tenantMiddlewareInstalled = true;
}


