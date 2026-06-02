import { z } from 'zod';

export const createAccountSchema = z.object({
  name: z.string().min(1, 'الاسم مطلوب').max(100, 'الاسم طويل جداً').trim(),
  phoneId: z.string().min(1, 'معرّف رقم الهاتف مطلوب'),
  businessId: z.string().min(1, 'معرّف الحساب التجاري مطلوب'),
  accessToken: z.string().min(1, 'رمز الوصول مطلوب'),
  appId: z.string().optional(),
  appSecret: z.string().optional(),
  webhookVerifyToken: z.string().optional(),
  apiVersion: z.string().default('v21.0'),
  isDefaultIncoming: z.boolean().optional().default(false),
  isDefaultOutgoing: z.boolean().optional().default(false),
  autoReadReceipt: z.boolean().optional().default(false),
  businessCallingEnabled: z.boolean().optional().default(false),
  status: z.enum(['active', 'inactive', 'disabled']).optional().default('active'),
}).refine(
  (data) => {
    if (data.isDefaultIncoming || data.isDefaultOutgoing) {
      return data.webhookVerifyToken && data.webhookVerifyToken.length > 0;
    }
    return true;
  },
  { message: 'webhookVerifyToken مطلوب عند تعيين الحساب كافتراضي', path: ['webhookVerifyToken'] }
);

export const updateAccountSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  phoneId: z.string().min(1).optional(),
  businessId: z.string().min(1).optional(),
  accessToken: z.string().min(1).optional(),
  appId: z.string().optional().nullable(),
  appSecret: z.string().optional().nullable(),
  webhookVerifyToken: z.string().optional().nullable(),
  apiVersion: z.string().optional(),
  isDefaultIncoming: z.boolean().optional(),
  isDefaultOutgoing: z.boolean().optional(),
  autoReadReceipt: z.boolean().optional(),
  businessCallingEnabled: z.boolean().optional(),
  status: z.enum(['active', 'inactive', 'disabled']).optional(),
}).strict();

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;


