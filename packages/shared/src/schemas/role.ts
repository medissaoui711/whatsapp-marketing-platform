import { z } from 'zod';

export const roleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  isDefault: z.boolean().optional().default(false),
  permissions: z.array(z.string()).optional().default([]),
});

export const updateRoleSchema = roleSchema.partial();

export type RoleInput = z.infer<typeof roleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

export interface RoleResponse {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  isDefault: boolean;
  permissions: string[];
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PermissionResponse {
  id: string;
  resource: string;
  action: string;
  description: string;
  key: string;
}


