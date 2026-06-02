import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('البريد الإلكتروني غير صالح'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
  subdomain: z.string().min(1, 'اسم المؤسسة مطلوب'),
});

export const registerSchema = z.object({
  email: z.string().email('البريد الإلكتروني غير صالح'),
  password: z.string().min(12, 'كلمة المرور يجب أن تكون 12 حرفاً على الأقل'),
  fullName: z.string().min(1, 'الاسم الكامل مطلوب'),
  organizationId: z.string().min(1, 'معرف المنظمة مطلوب'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().optional(),
});

export const logoutSchema = z.object({
  refreshToken: z.string().optional(),
});

export const switchOrgSchema = z.object({
  organizationId: z.string().min(1, 'معرف المنظمة مطلوب'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type SwitchOrgInput = z.infer<typeof switchOrgSchema>;

export interface UserInfo {
  id: string;
  email: string;
  fullName: string | null;
  roleId?: string;
  role?: {
    id: string;
    name: string;
    permissions?: Array<{ resource: string; action: string }>;
  };
  isActive: boolean;
  isSuperAdmin: boolean;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
}


