import { z } from 'zod';

export const createCatalogSchema = z.object({
  whatsappAccount: z.string().min(1, 'WhatsApp account is required'),
  name: z.string().min(1, 'Catalog name is required'),
});

export const updateCatalogSchema = createCatalogSchema.partial();

export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional().default(''),
  price: z.number().positive('Price must be greater than 0'),
  currency: z.string().default('USD'),
  url: z.string().url().optional().default(''),
  imageUrl: z.string().url().optional().default(''),
  retailerId: z.string().optional().default(''),
});

export const updateProductSchema = createProductSchema.partial();

export const syncCatalogsSchema = z.object({
  whatsappAccount: z.string().min(1, 'WhatsApp account is required'),
});

export type CreateCatalogInput = z.infer<typeof createCatalogSchema>;
export type UpdateCatalogInput = z.infer<typeof updateCatalogSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type SyncCatalogsInput = z.infer<typeof syncCatalogsSchema>;

export interface CatalogResponse {
  id: string;
  metaCatalogId: string;
  whatsappAccount: string | null;
  name: string;
  isActive: boolean;
  productCount: number;
  products?: CatalogProductResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface CatalogProductResponse {
  id: string;
  metaProductId: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  url: string | null;
  imageUrl: string | null;
  retailerId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}


