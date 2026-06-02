import { PrismaClient } from '@prisma/client';

const customIndexes = [
  `CREATE INDEX IF NOT EXISTS idx_messages_contact_created ON "Message"(contact_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_messages_conversation ON "Message"(conversation_id)`,

  `CREATE INDEX IF NOT EXISTS idx_contacts_assigned_read ON "Contact"(assigned_user_id, is_read)`,
  `CREATE INDEX IF NOT EXISTS idx_contacts_account ON "Contact"(whatsapp_account)`,
  `CREATE INDEX IF NOT EXISTS idx_contacts_tags ON "Contact" USING GIN (tags)`,

  `CREATE INDEX IF NOT EXISTS idx_sessions_org_status ON "ChatbotSession"(organization_id, status)`,

  `CREATE INDEX IF NOT EXISTS idx_keyword_rules_org_enabled_priority ON "KeywordRule"(organization_id, is_enabled, priority DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_keyword_rules_account_enabled ON "KeywordRule"(whatsapp_account, is_enabled, priority DESC)`,

  `CREATE INDEX IF NOT EXISTS idx_agent_transfers_org_status ON "AgentTransfer"(organization_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_agent_transfers_org_contact ON "AgentTransfer"(organization_id, contact_id)`,
  `CREATE INDEX IF NOT EXISTS idx_agent_transfers_agent_active ON "AgentTransfer"(agent_id) WHERE status = 'active'`,
  `CREATE INDEX IF NOT EXISTS idx_agent_transfers_team ON "AgentTransfer"(team_id)`,

  `CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_accounts_org_phone ON "WhatsAppAccount"(organization_id, phone_id)`,

  `CREATE INDEX IF NOT EXISTS idx_templates_account ON "Template"(whatsapp_account, status)`,

  `CREATE INDEX IF NOT EXISTS idx_ai_contexts_account_enabled ON "AIContext"(whatsapp_account, is_enabled, priority DESC)`,

  `CREATE INDEX IF NOT EXISTS idx_bulk_campaigns_account_status ON "BulkMessageCampaign"(whatsapp_account, status)`,

  `CREATE UNIQUE INDEX IF NOT EXISTS idx_canned_responses_org_name ON "CannedResponse"(organization_id, name)`,

  `CREATE INDEX IF NOT EXISTS idx_webhooks_org_active ON "Webhook"(organization_id, is_active)`,

  `CREATE INDEX IF NOT EXISTS idx_teams_org_active ON "Team"(organization_id, is_active)`,

  `CREATE INDEX IF NOT EXISTS idx_custom_roles_org_system ON "CustomRole"(organization_id, is_system)`,
  `CREATE INDEX IF NOT EXISTS idx_custom_roles_org_default ON "CustomRole"(organization_id, is_default) WHERE is_default = true`,

  `CREATE INDEX IF NOT EXISTS idx_conversation_notes_contact ON "ConversationNote"(organization_id, contact_id, created_at DESC)`,

  `CREATE INDEX IF NOT EXISTS idx_call_logs_org_status ON "CallLog"(organization_id, status, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_call_logs_contact ON "CallLog"(contact_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_call_logs_wa_call_id ON "CallLog"(whatsapp_call_id)`,

  `CREATE INDEX IF NOT EXISTS idx_ivr_flows_org_account_active ON "IVRFlow"(organization_id, whatsapp_account, is_active)`,

  `CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created ON "AuditLog"(organization_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON "AuditLog"(resource_type, resource_id)`,

  `CREATE INDEX IF NOT EXISTS idx_notification_rules_org_enabled ON "NotificationRule"(organization_id, is_enabled)`,
];

export async function createCustomIndexes(prisma: PrismaClient): Promise<void> {
  console.log('Creating custom indexes...');

  let successCount = 0;
  let failCount = 0;

  for (const indexSql of customIndexes) {
    try {
      await prisma.$executeRawUnsafe(indexSql);
      successCount++;
    } catch {
      failCount++;
    }
  }

  console.log(`Custom indexes created: ${successCount} successful, ${failCount} skipped`);
}


