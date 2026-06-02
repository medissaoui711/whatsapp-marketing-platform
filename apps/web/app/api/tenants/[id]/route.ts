import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@repo/auth';
import { organizationService } from '@repo/db';
import type { AuthContext } from '@repo/auth';

export const GET = withAuth(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } },
) => {
  if (!context.isSuperAdmin && context.tenantId !== params.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const org = await organizationService.getById(params.id);
  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  const stats = await organizationService.getStats(params.id);
  return NextResponse.json({ ...org, stats });
});

export const PUT = withAuth(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } },
) => {
  if (!context.isSuperAdmin && context.tenantId !== params.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const org = await organizationService.update(params.id, body);
  return NextResponse.json(org);
});

export const DELETE = withAuth(async (
  request: NextRequest,
  context: AuthContext,
  { params }: { params: { id: string } },
) => {
  if (!context.isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await organizationService.delete(params.id);
  return NextResponse.json({ message: 'Organization deleted successfully' });
});
