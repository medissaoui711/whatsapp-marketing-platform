import { z } from 'zod';

export const createCampaignSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  whatsappAccount: z.string().min(1, 'WhatsApp account is required'),
  templateId: z.string().min(1, 'Template ID is required'),
  headerMediaId: z.string().optional(),
  scheduledAt: z.string().optional(),
});

export const updateCampaignSchema = createCampaignSchema.partial();

export const recipientSchema = z.object({
  phoneNumber: z.string().min(1, 'Phone number is required'),
  recipientName: z.string().optional(),
  templateParams: z.record(z.string(), z.any()).default({}),
  headerParams: z.record(z.string(), z.any()).default({}),
});

export const importRecipientsSchema = z.object({
  recipients: z.array(recipientSchema).min(1, 'At least one recipient is required'),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type RecipientInput = z.infer<typeof recipientSchema>;
export type ImportRecipientsInput = z.infer<typeof importRecipientsSchema>;

export interface CampaignResponse {
  id: string;
  name: string;
  whatsappAccount: string;
  templateId: string;
  templateName: string | null;
  headerMediaId?: string;
  headerMediaFilename?: string;
  headerMediaMimeType?: string;
  status: 'draft' | 'scheduled' | 'queued' | 'processing' | 'paused' | 'completed' | 'cancelled' | 'failed';
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  createdByName: string | null;
  updatedByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecipientResponse {
  id: string;
  campaignId: string;
  phoneNumber: string;
  recipientName: string | null;
  templateParams: Record<string, any>;
  headerParams: Record<string, any>;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  whatsappMessageId: string | null;
  errorMessage: string | null;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  createdAt: string;
}


