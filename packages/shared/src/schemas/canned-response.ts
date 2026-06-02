import { z } from 'zod';

export const createCannedResponseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  shortcut: z.string().max(50).optional(),
  content: z.string().min(1, 'Content is required').max(5000),
  category: z.string().max(100).optional(),
  isActive: z.boolean().default(true),
  buttons: z.array(z.object({
    type: z.enum(['reply', 'url', 'phone']),
    title: z.string().min(1).max(50),
    payload: z.string().optional(),
    url: z.string().url().optional(),
    phoneNumber: z.string().optional(),
  })).default([]),
});

export const updateCannedResponseSchema = createCannedResponseSchema.partial();

export type CreateCannedResponseInput = z.infer<typeof createCannedResponseSchema>;
export type UpdateCannedResponseInput = z.infer<typeof updateCannedResponseSchema>;

export interface CannedResponseButton {
  type: 'reply' | 'url' | 'phone';
  title: string;
  payload?: string;
  url?: string;
  phoneNumber?: string;
}

export interface CannedResponseResponse {
  id: string;
  name: string;
  shortcut: string | null;
  content: string;
  category: string | null;
  isActive: boolean;
  usageCount: number;
  buttons: CannedResponseButton[];
  createdById: string;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}


