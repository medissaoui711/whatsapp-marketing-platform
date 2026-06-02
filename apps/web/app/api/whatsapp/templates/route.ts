import { NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuth } from '@repo/auth';

export const GET = withAuth(async (request, context) => {
  try {
    const templates = await prisma.template.findMany({
      where: {
        organizationId: context.tenantId,
        status: 'APPROVED',
      },
      select: {
        id: true,
        name: true,
        language: true,
        category: true,
        bodyContent: true,
        headerType: true,
        headerContent: true,
        buttons: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Failed to fetch templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
