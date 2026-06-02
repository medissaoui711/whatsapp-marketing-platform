import { z } from 'zod';

export const createWebhookSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  url: z.string().url('Valid URL is required'),
  events: z.array(z.string()).min(1, 'At least one event is required'),
  headers: z.record(z.string(), z.string()).optional().default({}),
  secret: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateWebhookSchema = createWebhookSchema.partial();

export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;
export type UpdateWebhookInput = z.infer<typeof updateWebhookSchema>;

export interface WebhookResponse {
  id: string;
  name: string;
  url: string;
  events: string[];
  headers: Record<string, string>;
  hasSecret: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type WebhookEvent =
  | 'message.incoming'
  | 'message.outgoing'
  | 'message.sent'
  | 'message.delivered'
  | 'message.read'
  | 'message.failed'
  | 'contact.created'
  | 'campaign.started'
  | 'campaign.completed'
  | 'campaign.paused'
  | 'campaign.cancelled'
  | 'campaign.failed'
  | 'transfer.created'
  | 'transfer.resumed'
  | 'transfer.assigned';

export interface WebhookEventInfo {
  value: string;
  label: string;
  labelAr: string;
  description: string;
}

export const AvailableWebhookEvents: WebhookEventInfo[] = [
  { value: 'message.incoming', label: 'Message Incoming', labelAr: 'رسالة واردة', description: 'When a new message is received from a contact' },
  { value: 'message.sent', label: 'Message Sent', labelAr: 'رسالة مرسلة', description: 'When an agent sends a message' },
  { value: 'message.delivered', label: 'Message Delivered', labelAr: 'تم تسليم الرسالة', description: 'When a message is delivered' },
  { value: 'message.read', label: 'Message Read', labelAr: 'تم قراءة الرسالة', description: 'When a message is read by the recipient' },
  { value: 'message.failed', label: 'Message Failed', labelAr: 'فشل الرسالة', description: 'When a message fails to send' },
  { value: 'contact.created', label: 'Contact Created', labelAr: 'إنشاء جهة اتصال', description: 'When a new contact is created' },
  { value: 'campaign.started', label: 'Campaign Started', labelAr: 'بدء الحملة', description: 'When a campaign starts sending' },
  { value: 'campaign.completed', label: 'Campaign Completed', labelAr: 'اكتمال الحملة', description: 'When a campaign finishes' },
  { value: 'campaign.paused', label: 'Campaign Paused', labelAr: 'إيقاف الحملة', description: 'When a campaign is paused' },
  { value: 'campaign.cancelled', label: 'Campaign Cancelled', labelAr: 'إلغاء الحملة', description: 'When a campaign is cancelled' },
  { value: 'campaign.failed', label: 'Campaign Failed', labelAr: 'فشل الحملة', description: 'When a campaign fails' },
  { value: 'transfer.created', label: 'Transfer Created', labelAr: 'إنشاء تحويل', description: 'When a transfer to human agent is requested' },
  { value: 'transfer.assigned', label: 'Transfer Assigned', labelAr: 'تعيين تحويل', description: 'When a transfer is assigned to an agent' },
  { value: 'transfer.resumed', label: 'Transfer Resumed', labelAr: 'استئناف المحادثة', description: 'When chatbot is resumed (transfer closed)' },
];


