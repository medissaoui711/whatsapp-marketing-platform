import { z } from 'zod';

export const sendMessageSchema = z.object({
  type: z.enum(['text', 'image', 'document', 'video', 'audio', 'interactive']),
  content: z.object({
    body: z.string().optional(),
  }),
  replyToMessageId: z.string().optional(),
  whatsappAccount: z.string().optional(),
  interactive: z.object({
    type: z.enum(['button', 'list', 'cta_url', 'voice_call']),
    body: z.string(),
    buttons: z.array(z.object({
      id: z.string(),
      title: z.string(),
    })).optional(),
    buttonText: z.string().optional(),
    url: z.string().url().optional(),
    displayText: z.string().optional(),
    ttlMinutes: z.number().min(0).max(60).optional().default(0),
  }).optional(),
});

export const sendReactionSchema = z.object({
  emoji: z.string(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type SendReactionInput = z.infer<typeof sendReactionSchema>;

export interface MessageResponse {
  id: string;
  contactId: string;
  direction: 'incoming' | 'outgoing';
  messageType: string;
  content: string | null;
  mediaUrl?: string;
  mediaMimeType?: string;
  mediaFilename?: string;
  interactiveData?: Record<string, any>;
  status: string;
  wamid: string | null;
  errorMessage: string | null;
  isReply: boolean;
  replyToMessageId?: string;
  replyToMessage?: {
    id: string;
    content: string | null;
    messageType: string;
    direction: string;
  };
  whatsappAccount: string;
  createdAt: string;
  updatedAt: string;
}


