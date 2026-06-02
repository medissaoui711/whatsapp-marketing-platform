import { z } from 'zod';

export const createTransferSchema = z.object({
  contactId: z.string().min(1, 'Contact ID is required'),
  whatsappAccount: z.string().min(1, 'WhatsApp account is required'),
  agentId: z.string().optional().nullable(),
  teamId: z.string().optional().nullable(),
  notes: z.string().optional().default(''),
  source: z.enum(['manual', 'flow', 'keyword', 'chatbot_disabled']).default('manual'),
});

export const assignTransferSchema = z.object({
  agentId: z.string().optional().nullable(),
  teamId: z.string().optional().nullable(),
}).strict();

export type CreateTransferInput = z.infer<typeof createTransferSchema>;
export type AssignTransferInput = z.infer<typeof assignTransferSchema>;


