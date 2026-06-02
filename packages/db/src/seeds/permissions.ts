export interface PermissionSeed {
  resource: string;
  action: string;
  description: string;
}

export const defaultPermissions: PermissionSeed[] = [
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

  { resource: 'accounts', action: 'read', description: 'View WhatsApp accounts' },
  { resource: 'accounts', action: 'write', description: 'Create and edit WhatsApp accounts' },
  { resource: 'accounts', action: 'delete', description: 'Delete WhatsApp accounts' },

  { resource: 'templates', action: 'read', description: 'View message templates' },
  { resource: 'templates', action: 'write', description: 'Create and edit templates' },
  { resource: 'templates', action: 'delete', description: 'Delete templates' },
  { resource: 'templates', action: 'sync', description: 'Sync templates with Meta' },

  { resource: 'flows.whatsapp', action: 'read', description: 'View WhatsApp flows' },
  { resource: 'flows.whatsapp', action: 'write', description: 'Create and edit WhatsApp flows' },
  { resource: 'flows.whatsapp', action: 'delete', description: 'Delete WhatsApp flows' },

  { resource: 'flows.chatbot', action: 'read', description: 'View chatbot flows' },
  { resource: 'flows.chatbot', action: 'write', description: 'Create and edit chatbot flows' },
  { resource: 'flows.chatbot', action: 'delete', description: 'Delete chatbot flows' },

  { resource: 'campaigns', action: 'read', description: 'View campaigns' },
  { resource: 'campaigns', action: 'write', description: 'Create and edit campaigns' },
  { resource: 'campaigns', action: 'delete', description: 'Delete campaigns' },
  { resource: 'campaigns', action: 'execute', description: 'Execute campaigns' },

  { resource: 'chatbot.keywords', action: 'read', description: 'View keyword rules' },
  { resource: 'chatbot.keywords', action: 'write', description: 'Create and edit keyword rules' },
  { resource: 'chatbot.keywords', action: 'delete', description: 'Delete keyword rules' },

  { resource: 'chatbot.ai', action: 'read', description: 'View AI contexts' },
  { resource: 'chatbot.ai', action: 'write', description: 'Create and edit AI contexts' },
  { resource: 'chatbot.ai', action: 'delete', description: 'Delete AI contexts' },

  { resource: 'chat', action: 'read', description: 'View chat conversations' },
  { resource: 'chat', action: 'write', description: 'Send messages' },
  { resource: 'chat.assign', action: 'write', description: 'Assign conversations to agents' },

  { resource: 'contacts', action: 'read', description: 'View contacts' },
  { resource: 'contacts', action: 'write', description: 'Create and edit contacts' },
  { resource: 'contacts', action: 'delete', description: 'Delete contacts' },
  { resource: 'contacts', action: 'import', description: 'Import contacts' },
  { resource: 'contacts', action: 'export', description: 'Export contacts' },

  { resource: 'tags', action: 'read', description: 'View tags' },
  { resource: 'tags', action: 'write', description: 'Create and edit tags' },
  { resource: 'tags', action: 'delete', description: 'Delete tags' },

  { resource: 'analytics', action: 'read', description: 'View analytics dashboard' },
  { resource: 'analytics', action: 'write', description: 'Create and edit dashboard widgets' },
  { resource: 'analytics', action: 'delete', description: 'Delete dashboard widgets' },
  { resource: 'analytics.agents', action: 'read', description: 'View agent analytics' },

  { resource: 'transfers', action: 'read', description: 'View agent transfers' },
  { resource: 'transfers', action: 'write', description: 'Create transfers' },
  { resource: 'transfers', action: 'pickup', description: 'Pickup transfers from queue' },

  { resource: 'webhooks', action: 'read', description: 'View webhooks' },
  { resource: 'webhooks', action: 'write', description: 'Create and edit webhooks' },
  { resource: 'webhooks', action: 'delete', description: 'Delete webhooks' },

  { resource: 'api_keys', action: 'read', description: 'View API keys' },
  { resource: 'api_keys', action: 'write', description: 'Create API keys' },
  { resource: 'api_keys', action: 'delete', description: 'Delete API keys' },

  { resource: 'canned_responses', action: 'read', description: 'View canned responses' },
  { resource: 'canned_responses', action: 'write', description: 'Create and edit canned responses' },
  { resource: 'canned_responses', action: 'delete', description: 'Delete canned responses' },

  { resource: 'custom_actions', action: 'read', description: 'View custom actions' },
  { resource: 'custom_actions', action: 'write', description: 'Create and edit custom actions' },
  { resource: 'custom_actions', action: 'delete', description: 'Delete custom actions' },
  { resource: 'custom_actions', action: 'execute', description: 'Execute custom actions' },

  { resource: 'organizations', action: 'read', description: 'View organizations' },
  { resource: 'organizations', action: 'write', description: 'Create organizations' },
  { resource: 'organizations', action: 'delete', description: 'Delete organizations' },
  { resource: 'organizations', action: 'assign', description: 'Manage organization members' },

  { resource: 'call_logs', action: 'read', description: 'View call logs' },

  { resource: 'ivr_flows', action: 'read', description: 'View IVR flows' },
  { resource: 'ivr_flows', action: 'write', description: 'Create and edit IVR flows' },
  { resource: 'ivr_flows', action: 'delete', description: 'Delete IVR flows' },

  { resource: 'call_transfers', action: 'read', description: 'View call transfers' },
  { resource: 'call_transfers', action: 'write', description: 'Accept and manage call transfers' },

  { resource: 'outgoing_calls', action: 'read', description: 'View outgoing call status' },
  { resource: 'outgoing_calls', action: 'write', description: 'Initiate outgoing calls' },

  { resource: 'audit_logs', action: 'read', description: 'View audit logs' },
];

export const systemRolePermissions: Record<string, string[]> = {
  admin: defaultPermissions.map(p => `${p.resource}:${p.action}`),

  manager: [
    'teams:read',
    'settings.general:read', 'settings.general:write',
    'settings.chatbot:read', 'settings.chatbot:write',
    'accounts:read', 'accounts:write', 'accounts:delete',
    'templates:read', 'templates:write', 'templates:delete', 'templates:sync',
    'flows.whatsapp:read', 'flows.whatsapp:write', 'flows.whatsapp:delete',
    'flows.chatbot:read', 'flows.chatbot:write', 'flows.chatbot:delete',
    'campaigns:read', 'campaigns:write', 'campaigns:delete', 'campaigns:execute',
    'chatbot.keywords:read', 'chatbot.keywords:write', 'chatbot.keywords:delete',
    'chatbot.ai:read', 'chatbot.ai:write', 'chatbot.ai:delete',
    'chat:read', 'chat:write', 'chat.assign:write',
    'contacts:read', 'contacts:write', 'contacts:delete', 'contacts:import', 'contacts:export',
    'tags:read', 'tags:write', 'tags:delete',
    'analytics:read', 'analytics.agents:read',
    'transfers:read', 'transfers:write', 'transfers:pickup',
    'webhooks:read', 'webhooks:write', 'webhooks:delete',
    'canned_responses:read', 'canned_responses:write', 'canned_responses:delete',
    'custom_actions:read', 'custom_actions:write', 'custom_actions:delete',
    'organizations:read',
    'call_logs:read',
    'ivr_flows:read', 'ivr_flows:write', 'ivr_flows:delete',
    'call_transfers:read', 'call_transfers:write',
    'outgoing_calls:read', 'outgoing_calls:write',
  ],

  agent: [
    'chat:read', 'chat:write',
    'contacts:read',
    'tags:read',
    'analytics.agents:read',
    'transfers:read', 'transfers:write', 'transfers:pickup',
    'canned_responses:read',
    'call_transfers:read', 'call_transfers:write',
    'outgoing_calls:read', 'outgoing_calls:write',
  ],
};


