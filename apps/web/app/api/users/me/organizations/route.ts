import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { withAuth } from '@repo/auth';
import type { MyOrganizationResponse } from '@repo/shared';

export const GET = withAuth(async (request: NextRequest, context) => {
  try {
    const userOrgs = await prisma.userOrganization.findMany({
      where: { userId: context.userId },
      include: {
        organization: true,
        role: true,
      },
    });

    const data: MyOrganizationResponse[] = userOrgs.map(uo => ({
      organizationId: uo.organizationId,
      name: uo.organization.name,
      slug: uo.organization.slug,
      roleId: uo.roleId || undefined,
      roleName: uo.role?.name,
      isDefault: uo.isDefault,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('User organizations error:', error);
    return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 });
  }
});


