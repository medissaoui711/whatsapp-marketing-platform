import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuthAndPermission } from '@repo/auth';
import type { AuthContext } from '@repo/auth';
import type { AuditLogResponse } from '@repo/shared';

export const GET = withAuthAndPermission('audit:read')(async (
  request: NextRequest,
  context: AuthContext
) => {
  const id = request.url.split('/audit/')[1]?.split('/')[0];

  if (!id) {
    return NextResponse.json({ error: 'معرّف السجل مطلوب' }, { status: 400 });
  }

  const auditLog = await prisma.auditLog.findFirst({
    where: { id, organizationId: context.tenantId },
    include: { user: { select: { email: true, fullName: true } } },
  });

  if (!auditLog) {
    return NextResponse.json({ error: 'سجل التدقيق غير موجود' }, { status: 404 });
  }

  const response: AuditLogResponse = {
    id: auditLog.id,
    resourceType: auditLog.resourceType,
    resourceId: auditLog.resourceId,
    userId: auditLog.userId,
    userName: auditLog.userName,
    action: auditLog.action as 'created' | 'updated' | 'deleted',
    changes: auditLog.changes as any[],
    createdAt: auditLog.createdAt.toISOString(),
  };

  return NextResponse.json(response);
});
