import { z } from 'zod';

const whatasppConfigSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  phoneNumberId: z.string().min(1, 'Phone number ID is required'),
  businessAccountId: z.string().optional(),
});

const telegramConfigSchema = z.object({
  botToken: z.string().min(1, 'Bot token is required'),
  chatId: z.string().optional(),
});

const webhookConfigSchema = z.object({
  url: z.string().url('Invalid webhook URL'),
  secret: z.string().optional(),
});

const emailConfigSchema = z.object({
  host: z.string().min(1, 'SMTP host is required'),
  port: z.number().int().positive('Port must be a positive number'),
  user: z.string().min(1, 'SMTP user is required'),
  pass: z.string().min(1, 'SMTP password is required'),
  from: z.string().email('From email is required'),
});

const integrationTypeToConfig: Record<string, z.ZodTypeAny> = {
  whatsapp: whatasppConfigSchema,
  telegram: telegramConfigSchema,
  webhook: webhookConfigSchema,
  email: emailConfigSchema,
};

export const createIntegrationSchema = z.object({
  type: z.enum(['whatsapp', 'telegram', 'webhook', 'email']).describe('نوع التكامل'),
  config: z.record(z.string(), z.unknown()).describe('إعدادات التكامل'),
  enabled: z.boolean().optional().default(true),
}).refine(
  (data) => {
    const configSchema = integrationTypeToConfig[data.type];
    if (!configSchema) return true;
    return configSchema.safeParse(data.config).success;
  },
  { message: 'تكوين غير صالح لنوع التكامل المحدد. تأكد من إدخال جميع الحقول المطلوبة.' }
);

export const updateIntegrationSchema = z.object({
  type: z.enum(['whatsapp', 'telegram', 'webhook', 'email']).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  enabled: z.boolean().optional(),
}).strict();

export type CreateIntegrationInput = z.infer<typeof createIntegrationSchema>;
export type UpdateIntegrationInput = z.infer<typeof updateIntegrationSchema>;

export const INTEGRATION_TYPES = ['whatsapp', 'telegram', 'webhook', 'email'] as const;
export type IntegrationType = typeof INTEGRATION_TYPES[number];

export const INTEGRATION_LABELS: Record<IntegrationType, string> = {
  whatsapp: 'WhatsApp Business API',
  telegram: 'Telegram Bot API',
  webhook: 'Webhook',
  email: 'SMTP Email',
};

export const INTEGRATION_ICONS: Record<IntegrationType, string> = {
  whatsapp: '💬',
  telegram: '📱',
  webhook: '🔗',
  email: '📧',
};


