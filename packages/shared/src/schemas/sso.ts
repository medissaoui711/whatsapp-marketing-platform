import { z } from 'zod';

export const ssoProviderRequestSchema = z.object({
  provider: z.string().min(1),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  isEnabled: z.boolean().optional().default(false),
  allowAutoCreate: z.boolean().optional().default(false),
  defaultRoleName: z.string().optional().default('agent'),
  allowedDomains: z.string().optional(),
  authUrl: z.string().optional(),
  tokenUrl: z.string().optional(),
  userInfoUrl: z.string().optional(),
});

export const updateSSOProviderSchema = ssoProviderRequestSchema.partial();

export type SSOProviderRequest = z.infer<typeof ssoProviderRequestSchema>;
export type UpdateSSOProviderRequest = z.infer<typeof updateSSOProviderSchema>;

export interface SSOProviderPublic {
  provider: string;
  isEnabled: boolean;
}

export interface SSOProviderResponse {
  id: string;
  organizationId: string;
  provider: string;
  clientId: string;
  clientSecret: string;
  isEnabled: boolean;
  allowAutoCreate: boolean;
  defaultRoleName: string;
  allowedDomains: string | null;
  authUrl: string | null;
  tokenUrl: string | null;
  userInfoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}


