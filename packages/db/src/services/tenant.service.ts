import { prisma } from '../index';
import { randomBytes } from 'crypto';

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  settings?: Record<string, any>;
}

export interface UpdateOrganizationInput {
  name?: string;
  settings?: Record<string, any>;
}

export class OrganizationService {
  async create(input: CreateOrganizationInput) {
    const existing = await prisma.organization.findUnique({
      where: { slug: input.slug },
    });

    if (existing) {
      throw new Error(`Organization slug "${input.slug}" is already taken`);
    }

    const org = await prisma.organization.create({
      data: {
        name: input.name,
        slug: input.slug,
        settings: input.settings || {},
      },
    });

    await this.seedSystemRoles(org.id);
    await this.seedDefaultWidgets(org.id);

    return org;
  }

  async update(orgId: string, input: UpdateOrganizationInput) {
    return prisma.organization.update({
      where: { id: orgId },
      data: input,
    });
  }

  async getBySlug(slug: string) {
    return prisma.organization.findUnique({
      where: { slug },
      include: {
        users: { take: 5, orderBy: { createdAt: 'desc' } },
        _count: { select: { users: true, contacts: true, campaigns: true } },
      },
    });
  }

  async getById(orgId: string) {
    return prisma.organization.findUnique({ where: { id: orgId } });
  }

  async delete(orgId: string) {
    return prisma.organization.update({
      where: { id: orgId },
      data: { deletedAt: new Date() },
    });
  }

  async getStats(orgId: string) {
    const [users, contacts, messages, campaigns, calls] = await Promise.all([
      prisma.user.count({ where: { organizationId: orgId } }),
      prisma.contact.count({ where: { organizationId: orgId } }),
      prisma.message.count({ where: { organizationId: orgId } }),
      prisma.bulkMessageCampaign.count({ where: { organizationId: orgId } }),
      prisma.callLog.count({ where: { organizationId: orgId } }),
    ]);

    return { users, contacts, messages, campaigns, calls };
  }

  private async seedSystemRoles(orgId: string) {
    const permissions = await prisma.permission.findMany();
    const permMap = new Map(permissions.map(p => [`${p.resource}:${p.action}`, p.id]));

    const roles = [
      { name: 'admin', description: 'Administrator with full access', isDefault: false },
      { name: 'manager', description: 'Manager with operational access', isDefault: false },
      { name: 'agent', description: 'Customer support agent', isDefault: true },
    ];

    const rolePerms: Record<string, string[]> = {
      admin: permissions.map(p => `${p.resource}:${p.action}`),
      manager: [
        'contacts:read', 'contacts:write', 'contacts:delete',
        'campaigns:read', 'campaigns:write', 'campaigns:execute',
        'chat:read', 'chat:write',
        'analytics:read',
      ],
      agent: [
        'contacts:read',
        'chat:read', 'chat:write',
        'transfers:read', 'transfers:write', 'transfers:pickup',
      ],
    };

    for (const role of roles) {
      const permIds = (rolePerms[role.name] || [])
        .map(key => permMap.get(key))
        .filter((id): id is string => id !== undefined);

      await prisma.customRole.upsert({
        where: { organizationId_name: { organizationId: orgId, name: role.name } },
        update: {},
        create: {
          organizationId: orgId,
          name: role.name,
          description: role.description,
          isSystem: true,
          isDefault: role.isDefault,
          rolePermissions: {
            create: permIds.map(permissionId => ({ permissionId })),
          },
        },
      });
    }
  }

  private async seedDefaultWidgets(orgId: string) {
    const defaults = [
      { name: 'Total Messages', dataSource: 'messages', metric: 'count', displayType: 'number', gridX: 0, gridY: 0, gridW: 3, gridH: 3 },
      { name: 'Active Contacts', dataSource: 'contacts', metric: 'count', displayType: 'number', gridX: 3, gridY: 0, gridW: 3, gridH: 3 },
      { name: 'Campaigns', dataSource: 'campaigns', metric: 'count', displayType: 'number', gridX: 6, gridY: 0, gridW: 3, gridH: 3 },
      { name: 'Recent Messages', dataSource: 'messages', metric: 'count', displayType: 'table', gridX: 0, gridY: 3, gridW: 6, gridH: 6 },
    ];

    for (const w of defaults) {
      await prisma.widget.create({
        data: {
          organizationId: orgId,
          name: w.name,
          dataSource: w.dataSource,
          metric: w.metric,
          displayType: w.displayType,
          showChange: true,
          size: 'small',
          gridX: w.gridX,
          gridY: w.gridY,
          gridW: w.gridW,
          gridH: w.gridH,
          isDefault: true,
          isShared: true,
        },
      });
    }
  }
}

export const organizationService = new OrganizationService();


