import { z } from 'zod';

export const createContactSchema = z.object({
  phoneNumber: z.string().min(1, 'Phone number is required'),
  profileName: z.string().optional().nullable().default(''),
  whatsappAccount: z.string().optional().default(''),
  tags: z.array(z.string()).optional().default([]),
  metadata: z.record(z.string(), z.any()).optional().default({}),
});

export const updateContactSchema = z.object({
  profileName: z.string().optional(),
  whatsappAccount: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  assignedUserId: z.string().optional().nullable(),
  clearAssignedAgent: z.boolean().optional(),
}).strict();

export const assignContactSchema = z.object({
  userId: z.string().optional().nullable(),
});

export const updateContactTagsSchema = z.object({
  tags: z.array(z.string()),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type AssignContactInput = z.infer<typeof assignContactSchema>;
export type UpdateContactTagsInput = z.infer<typeof updateContactTagsSchema>;

export interface ContactResponse {
  id: string;
  phoneNumber: string;
  profileName: string | null;
  tags: string[];
  metadata: Record<string, any>;
  assignedUserId: string | null;
  whatsappAccount: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string;
  isRead: boolean;
  lastInboundAt: string | null;
  serviceWindowOpen: boolean;
  marketingOptOut: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContactSessionDataResponse {
  sessionId?: string;
  flowId?: string;
  flowName?: string;
  sessionData: Record<string, any>;
  panelConfig: Record<string, any>;
}


