import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuthAndPermission } from '@repo/auth';
import type { AuthContext } from '@repo/auth';

export const GET = withAuthAndPermission('analytics:read')(async (
  request: NextRequest,
  context: AuthContext,
) => {
  const accounts = await prisma.whatsAppAccount.findMany({
    where: { organizationId: context.tenantId },
    select: { id: true, name: true, phoneId: true },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({
    accounts: accounts.map(acc => ({ id: acc.id, name: acc.name, phoneId: acc.phoneId })),
  });
});


