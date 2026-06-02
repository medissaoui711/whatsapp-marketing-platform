import { z } from 'zod';

export const sendTemplateMessageSchema = z.object({
  contactId: z.string().uuid().optional(),
  phoneNumber: z.string().optional(),
  templateName: z.string().optional(),
  templateId: z.string().uuid().optional(),
  templateParams: z.record(z.string()).optional(),
  buttonParams: z.record(z.string()).optional(),
  accountName: z.string().optional(),
  headerMediaId: z.string().optional(),
  headerMediaUrl: z.string().url().optional(),
  headerMediaFilename: z.string().optional(),
  headerParams: z.record(z.string()).optional(),
});

export type SendTemplateMessageInput = z.infer<typeof sendTemplateMessageSchema>;

export interface OutgoingMessageRequest {
  account: any;
  contact: any;
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'interactive' | 'template' | 'flow';
  content?: string;
  mediaId?: string;
  mediaData?: Buffer;
  mediaUrl?: string;
  mediaMimeType?: string;
  mediaFilename?: string;
  caption?: string;
  interactiveType?: string;
  bodyText?: string;
  buttons?: Array<{ id: string; title: string }>;
  buttonText?: string;
  url?: string;
  displayText?: string;
  ttlMinutes?: number;
  voiceCallPayload?: string;
  template?: any;
  bodyParams?: Record<string, string>;
  headerParams?: Record<string, string>;
  headerMediaId?: string;
  headerMediaFilename?: string;
  buttonUrlParams?: Record<string, string>;
  flowId?: string;
  flowHeader?: string;
  flowCta?: string;
  flowToken?: string;
  flowFirstScreen?: string;
  replyToMessage?: any;
}

export interface MessageSendOptions {
  broadcastWebSocket: boolean;
  dispatchWebhook: boolean;
  trackSLA: boolean;
  sentByUserId?: string;
  async: boolean;
  markIncomingRead: boolean;
}

export interface MessageEventData {
  messageId: string;
  contactId: string;
  contactPhone: string;
  contactName: string;
  messageType: string;
  content: string;
  whatsappAccount: string;
  direction: string;
  sentByUserId?: string;
}


