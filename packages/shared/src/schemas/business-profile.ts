import { z } from 'zod';

export const businessProfileInputSchema = z.object({
  messagingProduct: z.string().optional(),
  address: z.string().optional(),
  description: z.string().optional(),
  vertical: z.string().optional(),
  email: z.string().email().optional(),
  websites: z.array(z.string()).optional(),
  profilePictureHandle: z.string().optional(),
  about: z.string().optional(),
});

export type BusinessProfileInput = z.infer<typeof businessProfileInputSchema>;

export interface BusinessProfile {
  messagingProduct?: string;
  address?: string;
  description?: string;
  vertical?: string;
  email?: string;
  websites?: string[];
  profilePictureUrl?: string;
  about?: string;
}


