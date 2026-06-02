import { z } from 'zod';

export const conversationNoteSchema = z.object({
  content: z.string().min(1, 'Content is required'),
});

export type ConversationNoteInput = z.infer<typeof conversationNoteSchema>;

export interface ConversationNoteResponse {
  id: string;
  contactId: string;
  createdById: string;
  createdByName: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}


