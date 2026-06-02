import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultPermissions = [
  { resource: 'users', action: 'read', description: 'View users' },
  { resource: 'users', action: 'write', description: 'Create and edit users' },
  { resource: 'users', action: 'delete', description: 'Delete users' },

  { resource: 'teams', action: 'read', description: 'View teams' },
  { resource: 'teams', action: 'write', description: 'Create and edit teams' },
  { resource: 'teams', action: 'delete', description: 'Delete teams' },

  { resource: 'roles', action: 'read', description: 'View roles' },
  { resource: 'roles', action: 'write', description: 'Create and edit roles' },
  { resource: 'roles', action: 'delete', description: 'Delete roles' },

  { resource: 'settings.general', action: 'read', description: 'View general settings' },
  { resource: 'settings.general', action: 'write', description: 'Edit general settings' },
  { resource: 'settings.chatbot', action: 'read', description: 'View chatbot settings' },
  { resource: 'settings.chatbot', action: 'write', description: 'Edit chatbot settings' },
  { resource: 'settings.sso', action: 'read', description: 'View SSO settings' },
  { resource: 'settings.sso', action: 'write', description: 'Edit SSO settings' },

  { resource: 'campaigns', action: 'read', description: 'View campaigns' },
  { resource: 'campaigns', action: 'write', description: 'Create and edit campaigns' },
  { resource: 'campaigns', action: 'delete', description: 'Delete campaigns' },
  { resource: 'campaigns', action: 'execute', description: 'Execute campaigns' },

  { resource: 'contacts', action: 'read', description: 'View contacts' },
  { resource: 'contacts', action: 'write', description: 'Create and edit contacts' },
  { resource: 'contacts', action: 'delete', description: 'Delete contacts' },
  { resource: 'contacts', action: 'import', description: 'Import contacts' },
  { resource: 'contacts', action: 'export', description: 'Export contacts' },

  { resource: 'chat', action: 'read', description: 'View chat conversations' },
  { resource: 'chat', action: 'write', description: 'Send messages' },
  { resource: 'chat.assign', action: 'write', description: 'Assign conversations to agents' },

  { resource: 'accounts', action: 'read', description: 'View WhatsApp accounts' },
  { resource: 'accounts', action: 'write', description: 'Create and edit WhatsApp accounts' },
  { resource: 'accounts', action: 'delete', description: 'Delete WhatsApp accounts' },

  { resource: 'templates', action: 'read', description: 'View message templates' },
  { resource: 'templates', action: 'write', description: 'Create and edit templates' },
  { resource: 'templates', action: 'delete', description: 'Delete templates' },
  { resource: 'templates', action: 'sync', description: 'Sync templates with Meta' },

  { resource: 'webhooks', action: 'read', description: 'View webhooks' },
  { resource: 'webhooks', action: 'write', description: 'Create and edit webhooks' },
  { resource: 'webhooks', action: 'delete', description: 'Delete webhooks' },

  { resource: 'api_keys', action: 'read', description: 'View API keys' },
  { resource: 'api_keys', action: 'write', description: 'Create API keys' },
  { resource: 'api_keys', action: 'delete', description: 'Delete API keys' },

  { resource: 'canned_responses', action: 'read', description: 'View canned responses' },
  { resource: 'canned_responses', action: 'write', description: 'Create and edit canned responses' },
  { resource: 'canned_responses', action: 'delete', description: 'Delete canned responses' },

  { resource: 'analytics', action: 'read', description: 'View analytics dashboard' },
  { resource: 'analytics.agents', action: 'read', description: 'View agent analytics' },

  { resource: 'call_logs', action: 'read', description: 'View call logs' },

  { resource: 'ivr_flows', action: 'read', description: 'View IVR flows' },
  { resource: 'ivr_flows', action: 'write', description: 'Create and edit IVR flows' },
  { resource: 'ivr_flows', action: 'delete', description: 'Delete IVR flows' },

  { resource: 'audit_logs', action: 'read', description: 'View audit logs' },
];

export async function seedPermissions() {
  console.log('Seeding permissions...');

  for (const perm of defaultPermissions) {
    await prisma.permission.upsert({
      where: { resource_action: { resource: perm.resource, action: perm.action } },
      update: {},
      create: perm,
    });
  }

  console.log(`Seeded ${defaultPermissions.length} permissions`);
}

export const systemRolePermissions: Record<string, string[]> = {
  admin: defaultPermissions.map(p => `${p.resource}:${p.action}`),

  manager: [
    'teams:read',
    'settings.general:read', 'settings.general:write',
    'settings.chatbot:read', 'settings.chatbot:write',
    'accounts:read', 'accounts:write', 'accounts:delete',
    'templates:read', 'templates:write', 'templates:delete', 'templates:sync',
    'campaigns:read', 'campaigns:write', 'campaigns:delete', 'campaigns:execute',
    'chat:read', 'chat:write', 'chat.assign:write',
    'contacts:read', 'contacts:write', 'contacts:delete', 'contacts:import', 'contacts:export',
    'analytics:read', 'analytics.agents:read',
    'webhooks:read', 'webhooks:write', 'webhooks:delete',
    'canned_responses:read', 'canned_responses:write', 'canned_responses:delete',
    'organizations:read',
    'call_logs:read',
    'ivr_flows:read', 'ivr_flows:write', 'ivr_flows:delete',
  ],

  agent: [
    'chat:read', 'chat:write',
    'contacts:read',
    'analytics.agents:read',
    'canned_responses:read',
  ],
};

export async function seedSystemRoles(organizationId: string) {
  console.log('Seeding system roles...');

  const permissions = await prisma.permission.findMany();
  const permMap = new Map(
    permissions.map(p => [`${p.resource}:${p.action}`, p.id])
  );

  for (const [roleName, permStrings] of Object.entries(systemRolePermissions)) {
    const rolePermIds = permStrings
      .map(ps => permMap.get(ps))
      .filter((id): id is string => id !== undefined);

    await prisma.customRole.upsert({
      where: { organizationId_name: { organizationId, name: roleName } },
      update: {},
      create: {
        name: roleName,
        organizationId,
        isSystem: true,
        isDefault: roleName === 'agent',
        rolePermissions: {
          create: rolePermIds.map(permissionId => ({
            permissionId,
          })),
        },
      },
    });
  }

  console.log('Seeded system roles');
}


