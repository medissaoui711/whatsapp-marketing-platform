import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuthAndPermission } from '@repo/auth';
import type { AuthContext } from '@repo/auth';
import { formatFieldLabel } from '@repo/audit';

export const GET = withAuthAndPermission('audit:read')(async (
  request: NextRequest,
  context: AuthContext
) => {
  const url = new URL(request.url);
  const segments = url.pathname.split('/');
  const idIndex = segments.indexOf('audit') + 1;
  const id = segments[idIndex];

  if (!id) {
    return NextResponse.json({ error: 'معرّف السجل مطلوب' }, { status: 400 });
  }

  const auditLog = await prisma.auditLog.findFirst({
    where: { id, organizationId: context.tenantId },
  });

  if (!auditLog) {
    return NextResponse.json({ error: 'سجل التدقيق غير موجود' }, { status: 404 });
  }

  const rawChanges = auditLog.changes as Array<{ field: string; oldValue: unknown; newValue: unknown }>;

  const formattedChanges = rawChanges.map(change => ({
    field: formatFieldLabel(change.field),
    oldValue: change.oldValue ?? '(empty)',
    newValue: change.newValue ?? '(empty)',
    isChange: change.oldValue !== change.newValue,
  }));

  return NextResponse.json({ changes: formattedChanges });
});
