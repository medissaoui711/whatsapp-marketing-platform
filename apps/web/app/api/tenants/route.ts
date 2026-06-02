import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@repo/auth';
import { prisma, organizationService } from '@repo/db';
import type { AuthContext } from '@repo/auth';

export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  if (!context.isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  const [orgs, total] = await Promise.all([
    prisma.organization.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.organization.count(),
  ]);

  return NextResponse.json({
    tenants: orgs,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

export const POST = withAuth(async (request: NextRequest, context: AuthContext) => {
  if (!context.isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { name, slug, settings } = body;

  if (!name || !slug) {
    return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
  }

  try {
    const org = await organizationService.create({ name, slug, settings });
    return NextResponse.json(org, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 409 });
  }
});


