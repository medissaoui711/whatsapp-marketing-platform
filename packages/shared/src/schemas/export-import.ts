import { z } from 'zod';

export const exportRequestSchema = z.object({
  table: z.enum(['contacts']),
  columns: z.array(z.string()).optional(),
  filters: z.record(z.string(), z.any()).optional(),
  format: z.enum(['csv', 'json']).optional().default('csv'),
});

export const importRequestSchema = z.object({
  table: z.enum(['contacts']),
  columnMapping: z.record(z.string(), z.string()).optional(),
  updateOnDuplicate: z.boolean().optional().default(false),
});

export type ExportRequest = z.infer<typeof exportRequestSchema>;
export type ImportRequest = z.infer<typeof importRequestSchema>;

export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  messages: string[];
}


