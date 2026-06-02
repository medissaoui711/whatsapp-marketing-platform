import { z } from 'zod';

export const auditLogQuerySchema = z.object({
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  userId: z.string().optional(),
  action: z.enum(['created', 'updated', 'deleted']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;

export const auditLogResponseSchema = z.object({
  id: z.string(),
  resourceType: z.string(),
  resourceId: z.string(),
  userId: z.string(),
  userName: z.string(),
  action: z.enum(['created', 'updated', 'deleted']),
  changes: z.array(z.any()),
  createdAt: z.string(),
});

export type AuditLogResponse = z.infer<typeof auditLogResponseSchema>;

export const auditLogListResponseSchema = z.object({
  auditLogs: z.array(auditLogResponseSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export type AuditLogListResponse = z.infer<typeof auditLogListResponseSchema>;


