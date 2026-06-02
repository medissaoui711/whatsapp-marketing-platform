import { z } from 'zod';

export const userSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  fullName: z.string().min(1, 'Full name is required'),
  roleId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  isSuperAdmin: z.boolean().optional(),
});

export const updateUserSchema = userSchema.partial();

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

export const userSettingsSchema = z.object({
  emailNotifications: z.boolean().optional(),
  newMessageAlerts: z.boolean().optional(),
  campaignUpdates: z.boolean().optional(),
});

export const availabilitySchema = z.object({
  isAvailable: z.boolean(),
});

export type UserInput = z.infer<typeof userSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UserSettingsInput = z.infer<typeof userSettingsSchema>;
export type AvailabilityInput = z.infer<typeof availabilitySchema>;

export interface UserResponse {
  id: string;
  email: string;
  fullName: string | null;
  roleId?: string;
  role?: {
    id: string;
    name: string;
    description: string;
    isSystem: boolean;
    permissions?: Array<{
      id: string;
      resource: string;
      action: string;
      description?: string;
    }>;
  };
  isActive: boolean;
  isAvailable: boolean;
  isSuperAdmin: boolean;
  isMember: boolean;
  organizationId: string;
  settings?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface MyOrganizationResponse {
  organizationId: string;
  name: string;
  slug: string;
  roleId?: string;
  roleName?: string;
  isDefault: boolean;
}


