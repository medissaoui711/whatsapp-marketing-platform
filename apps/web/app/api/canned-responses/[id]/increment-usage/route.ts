import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuthAndPermission } from '@repo/auth';
import type { AuthContext } from '@repo/auth';

export const POST = withAuthAndPermission('canned_responses:read')(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } },
) => {
  const existing = await prisma.cannedResponse.findFirst({
    where: { id: params.id, organizationId: context.tenantId },
  });

  if (!existing) {
    return NextResponse.json({ error: 'الرد الجاهز غير موجود' }, { status: 404 });
  }

  await prisma.cannedResponse.update({
    where: { id: params.id },
    data: { usageCount: { increment: 1 } },
  });

  return NextResponse.json({ usageCount: existing.usageCount + 1 });
});
