import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuthAndPermission } from '@repo/auth';
import type { AuthContext } from '@repo/auth';

export const GET = withAuthAndPermission('roles:read')(async (
  request: NextRequest,
  context: AuthContext,
) => {
  const permissions = await prisma.permission.findMany({
    orderBy: [{ resource: 'asc' }, { action: 'asc' }],
  });

  return NextResponse.json({
    permissions: permissions.map(p => ({
      id: p.id,
      resource: p.resource,
      action: p.action,
      description: p.description,
      key: `${p.resource}:${p.action}`,
    })),
  });
});


