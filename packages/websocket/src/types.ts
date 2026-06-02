export interface WSMessage {
  type: string;
  payload: unknown;
}

export interface BroadcastMessage {
  orgId: string;
  userId?: string;
  contactId?: string;
  message: WSMessage;
}

export interface ScraperEvent {
  type: 'SCRAPE_STARTED' | 'SCRAPE_PROGRESS' | 'SCRAPE_COMPLETED' | 'SCRAPE_FAILED';
  jobId: string;
  tenantId: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface AuthPayload {
  token: string;
}

export interface SetContactPayload {
  contactId: string;
}

export type AuthenticateFn = (token: string) => Promise<{ userId: string; orgId: string }>;

export const MessageType = {
  AUTH: 'auth',
  NEW_MESSAGE: 'new_message',
  STATUS_UPDATE: 'status_update',
  CONTACT_UPDATE: 'contact_update',
  SET_CONTACT: 'set_contact',
  PING: 'ping',
  PONG: 'pong',

  AGENT_TRANSFER: 'agent_transfer',
  AGENT_TRANSFER_RESUME: 'agent_transfer_resume',
  AGENT_TRANSFER_ASSIGN: 'agent_transfer_assign',
  TRANSFER_ESCALATION: 'transfer_escalation',
  TRANSFER_EXPIRED: 'transfer_expired',
  TRANSFER_ESCALATED: 'transfer_escalated',

  CAMPAIGN_STATS_UPDATE: 'campaign_stats_update',
  PERMISSIONS_UPDATED: 'permissions_updated',

  CONVERSATION_NOTE_CREATED: 'conversation_note_created',
  CONVERSATION_NOTE_UPDATED: 'conversation_note_updated',
  CONVERSATION_NOTE_DELETED: 'conversation_note_deleted',

  CALL_INCOMING: 'call_incoming',
  CALL_ANSWERED: 'call_answered',
  CALL_ENDED: 'call_ended',

  CALL_TRANSFER_WAITING: 'call_transfer_waiting',
  CALL_TRANSFER_CONNECTED: 'call_transfer_connected',
  CALL_TRANSFER_COMPLETED: 'call_transfer_completed',
  CALL_TRANSFER_ABANDONED: 'call_transfer_abandoned',
  CALL_TRANSFER_NO_ANSWER: 'call_transfer_no_answer',
  CALL_TRANSFER_REASSIGNED: 'call_transfer_reassigned',

  CALL_HOLD: 'call_hold',
  CALL_RESUMED: 'call_resumed',

  OUTGOING_CALL_INITIATED: 'outgoing_call_initiated',
  OUTGOING_CALL_RINGING: 'outgoing_call_ringing',
  OUTGOING_CALL_ANSWERED: 'outgoing_call_answered',
  OUTGOING_CALL_REJECTED: 'outgoing_call_rejected',
  OUTGOING_CALL_ENDED: 'outgoing_call_ended',

  CALL_PERMISSION_UPDATE: 'call_permission_update',

  SCRAPE_STARTED: 'scrape_started',
  SCRAPE_PROGRESS: 'scrape_progress',
  SCRAPE_COMPLETED: 'scrape_completed',
  SCRAPE_FAILED: 'scrape_failed',
} as const;


