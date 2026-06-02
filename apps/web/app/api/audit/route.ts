import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { auditLogQuerySchema } from '@repo/shared';
import { withAuthAndPermission } from '@repo/auth';
import type { AuthContext } from '@repo/auth';
import type { AuditLogListResponse, AuditLogResponse } from '@repo/shared';

export const GET = withAuthAndPermission('audit:read')(async (
  request: NextRequest,
  context: AuthContext
) => {
  const { searchParams } = new URL(request.url);

  const queryResult = auditLogQuerySchema.safeParse({
    resourceType: searchParams.get('resourceType') || undefined,
    resourceId: searchParams.get('resourceId') || undefined,
    userId: searchParams.get('userId') || undefined,
    action: searchParams.get('action') || undefined,
    from: searchParams.get('from') || undefined,
    to: searchParams.get('to') || undefined,
    page: searchParams.get('page') || 1,
    limit: searchParams.get('limit') || 20,
  });

  if (!queryResult.success) {
    return NextResponse.json({
      error: 'معاملات البحث غير صحيحة',
      details: queryResult.error.issues.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    }, { status: 400 });
  }

  const { resourceType, resourceId, userId, action, from, to, page, limit } = queryResult.data;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { organizationId: context.tenantId };

  if (resourceType) where.resourceType = resourceType;
  if (resourceId) where.resourceId = resourceId;
  if (userId) where.userId = userId;
  if (action) where.action = action;

  const createdAtFilter: Record<string, Date> = {};
  if (from) {
    const fromDate = new Date(from);
    if (!isNaN(fromDate.getTime())) createdAtFilter.gte = fromDate;
  }
  if (to) {
    const toDate = new Date(to);
    if (!isNaN(toDate.getTime())) {
      if (to.length === 10) toDate.setHours(23, 59, 59, 999);
      createdAtFilter.lte = toDate;
    }
  }
  if (Object.keys(createdAtFilter).length > 0) where.createdAt = createdAtFilter;

  const [auditLogs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { user: { select: { email: true, fullName: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  const response: AuditLogListResponse = {
    auditLogs: auditLogs.map(log => ({
      id: log.id,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      userId: log.userId,
      userName: log.userName,
      action: log.action as 'created' | 'updated' | 'deleted',
      changes: log.changes as any[],
      createdAt: log.createdAt.toISOString(),
    })),
    total,
    page,
    limit,
  };

  return NextResponse.json(response);
});


