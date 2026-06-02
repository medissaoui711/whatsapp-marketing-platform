export type JSONB = Record<string, unknown>
export type JSONBArray = unknown[]

export type CampaignStatus =
  | 'draft' | 'scheduled' | 'queued' | 'processing'
  | 'paused' | 'completed' | 'cancelled' | 'failed'

export type MessageStatus =
  | 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'received'

export type MessageType =
  | 'text' | 'image' | 'video' | 'audio' | 'document'
  | 'template' | 'interactive' | 'flow' | 'reaction'
  | 'location' | 'contact'

export type Direction = 'incoming' | 'outgoing'

export type CallDirection = 'incoming' | 'outgoing'

export type CallStatus =
  | 'ringing' | 'answered' | 'completed' | 'missed'
  | 'rejected' | 'failed' | 'transferring' | 'initiating' | 'accepted'

export type DisconnectedBy = 'client' | 'agent' | 'system'

export type TeamRole = 'manager' | 'agent'

export type AssignmentStrategy = 'round_robin' | 'load_balanced' | 'manual'

export type ActionType = 'webhook' | 'url' | 'javascript'

export type AuditAction = 'created' | 'updated' | 'deleted'

export type TemplateStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export type TemplateCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'

export type AIProvider = 'openai' | 'anthropic' | 'google'

export type Resource =
  | 'users' | 'teams' | 'roles' | 'settings.general' | 'settings.chatbot'
  | 'settings.sso' | 'settings.calling' | 'settings.notification'
  | 'accounts' | 'templates' | 'flows.whatsapp' | 'flows.chatbot'
  | 'campaigns' | 'chatbot.keywords' | 'chatbot.ai' | 'chat' | 'chat.assign'
  | 'contacts' | 'tags' | 'analytics' | 'analytics.agents' | 'transfers'
  | 'webhooks' | 'api_keys' | 'canned_responses' | 'custom_actions'
  | 'organizations' | 'call_logs' | 'ivr_flows' | 'call_transfers'
  | 'outgoing_calls' | 'audit_logs'

export type Action = 'read' | 'write' | 'delete' | 'sync' | 'execute' | 'import' | 'export' | 'pickup' | 'assign'


