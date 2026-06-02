import { z } from 'zod';

export const createFlowSchema = z.object({
  whatsappAccount: z.string().min(1, 'WhatsApp account is required'),
  name: z.string().min(1, 'Flow name is required'),
  category: z.string().optional().default(''),
  jsonVersion: z.string().optional().default('6.0'),
  flowJson: z.record(z.string(), z.any()).optional().default({}),
  screens: z.array(z.any()).optional().default([]),
});

export const updateFlowSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().optional(),
  jsonVersion: z.string().optional(),
  flowJson: z.record(z.string(), z.any()).optional(),
  screens: z.array(z.any()).optional(),
  whatsappAccount: z.string().min(1).optional(),
});

export const syncFlowsSchema = z.object({
  whatsappAccount: z.string().min(1, 'WhatsApp account is required'),
});

export type CreateFlowInput = z.infer<typeof createFlowSchema>;
export type UpdateFlowInput = z.infer<typeof updateFlowSchema>;
export type SyncFlowsInput = z.infer<typeof syncFlowsSchema>;

export interface FlowResponse {
  id: string;
  whatsappAccount: string;
  metaFlowId: string;
  name: string;
  status: 'DRAFT' | 'PUBLISHED' | 'DEPRECATED' | 'BLOCKED';
  category: string;
  jsonVersion: string;
  flowJson: Record<string, any>;
  screens: any[];
  previewUrl: string;
  hasLocalChanges: boolean;
  createdAt: string;
  updatedAt: string;
}


