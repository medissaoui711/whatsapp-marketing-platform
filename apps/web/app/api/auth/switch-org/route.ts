import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { switchOrgSchema } from '@repo/shared';
import { withAuth, signAccessToken, signRefreshToken } from '@repo/auth';
import { setAuthCookies } from '@repo/auth/cookies';
import type { AuthContext } from '@repo/auth';
import { randomUUID } from 'crypto';

export const POST = withAuth(async (
  request: NextRequest,
  context: AuthContext,
) => {
  try {
    const body = await request.json();
    const validation = switchOrgSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'معطيات غير صحيحة',
        details: validation.error.issues.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      }, { status: 400 });
    }

    const { organizationId } = validation.data;

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      return NextResponse.json({ error: 'المنظمة غير موجودة' }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { id: context.userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    let roleId: string | undefined = user.roleId || undefined;

    if (!user.isSuperAdmin) {
      const userOrg = await prisma.userOrganization.findFirst({
        where: { userId: context.userId, organizationId },
      });

      if (!userOrg) {
        return NextResponse.json({ error: 'لست عضواً في هذه المنظمة' }, { status: 403 });
      }

      if (userOrg.roleId) {
        roleId = userOrg.roleId;
      }
    }

    let roleName = 'viewer';
    if (roleId) {
      const customRole = await prisma.customRole.findUnique({ where: { id: roleId } });
      if (customRole) roleName = customRole.name;
    }

    const jti = randomUUID();

    const accessToken = signAccessToken({
      userId: context.userId,
      email: user.email,
      role: roleName,
      tenantId: organizationId,
      isSuperAdmin: user.isSuperAdmin,
      roleId,
      organizationId,
    });

    const refreshToken = signRefreshToken({
      userId: context.userId,
      email: user.email,
      role: roleName,
      tenantId: organizationId,
      isSuperAdmin: user.isSuperAdmin,
      roleId,
      organizationId,
      jti,
    });

    const accessMaxAge = parseInt(process.env.JWT_ACCESS_EXPIRY_MINS || '15') * 60;
    const expiryDays = parseInt(process.env.JWT_REFRESH_EXPIRY_DAYS || '7');
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        jti,
        userId: context.userId,
        tenantId: organizationId,
        expiresAt,
      },
    });

    const response = NextResponse.json({
      expiresIn: accessMaxAge,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roleId,
        isActive: user.isActive,
        isSuperAdmin: user.isSuperAdmin,
        organization: { id: org.id, name: org.name, slug: org.slug },
      },
    });

    setAuthCookies(response, accessToken, refreshToken, {
      secure: process.env.NODE_ENV === 'production',
      domain: process.env.COOKIE_DOMAIN,
      basePath: process.env.NEXT_PUBLIC_BASE_PATH,
    });

    return response;
  } catch (error) {
    console.error('Switch org error:', error);
    return NextResponse.json({ error: 'حدث خطأ داخلي' }, { status: 500 });
  }
});


