import { z } from 'zod';

export const webhookConfigSchema = z.object({
  url: z.string().url('Valid URL is required'),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).optional().default('POST'),
  headers: z.record(z.string(), z.string()).optional().default({}),
  body: z.string().optional(),
});

export const urlConfigSchema = z.object({
  url: z.string().min(1, 'URL is required'),
  openInNewTab: z.boolean().optional().default(false),
});

export const javascriptConfigSchema = z.object({
  code: z.string().min(1, 'JavaScript code is required'),
});

export const createCustomActionSchema = z.discriminatedUnion('actionType', [
  z.object({
    name: z.string().min(1, 'Name is required'),
    icon: z.string().optional().default(''),
    actionType: z.literal('webhook'),
    config: webhookConfigSchema,
    isActive: z.boolean().optional().default(true),
    displayOrder: z.number().int().min(0).optional().default(0),
  }),
  z.object({
    name: z.string().min(1, 'Name is required'),
    icon: z.string().optional().default(''),
    actionType: z.literal('url'),
    config: urlConfigSchema,
    isActive: z.boolean().optional().default(true),
    displayOrder: z.number().int().min(0).optional().default(0),
  }),
  z.object({
    name: z.string().min(1, 'Name is required'),
    icon: z.string().optional().default(''),
    actionType: z.literal('javascript'),
    config: javascriptConfigSchema,
    isActive: z.boolean().optional().default(true),
    displayOrder: z.number().int().min(0).optional().default(0),
  }),
]);

export const updateCustomActionSchema = z.object({
  name: z.string().min(1).optional(),
  icon: z.string().optional(),
  actionType: z.enum(['webhook', 'url', 'javascript']).optional(),
  config: z.record(z.string(), z.any()).optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export type CreateCustomActionInput = z.infer<typeof createCustomActionSchema>;
export type UpdateCustomActionInput = z.infer<typeof updateCustomActionSchema>;
export type WebhookConfig = z.infer<typeof webhookConfigSchema>;
export type UrlConfig = z.infer<typeof urlConfigSchema>;
export type JavascriptConfig = z.infer<typeof javascriptConfigSchema>;

export interface CustomActionResponse {
  id: string;
  name: string;
  icon: string;
  actionType: 'webhook' | 'url' | 'javascript';
  config: Record<string, any>;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExecuteActionRequest {
  contactId: string;
}

export interface ActionResult {
  success: boolean;
  message?: string;
  redirectUrl?: string;
  clipboard?: string;
  toast?: {
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  };
  data?: Record<string, any>;
}


