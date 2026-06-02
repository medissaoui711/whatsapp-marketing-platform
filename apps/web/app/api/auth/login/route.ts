import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { signAccessToken, signRefreshToken } from '@repo/auth';
import { verifyPassword } from '@repo/auth';
import { setAuthCookies, CookieConfig } from '@repo/auth';

const cookieConfig: CookieConfig = {
  secure: process.env.NODE_ENV === 'production',
};

export async function POST(req: NextRequest) {
  try {
    const { email, password, subdomain } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        organization: true,
        userOrganizations: {
          include: { organization: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is deactivated' },
        { status: 403 }
      );
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        { error: 'Account has no password set (SSO only)' },
        { status: 400 }
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const tenantId = subdomain
      ? user.userOrganizations.find(o => o.organization.subdomain === subdomain)?.organizationId
      : user.organizationId;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant found for this user' },
        { status: 400 }
      );
    }

    const role = user.role?.name || user.isSuperAdmin ? 'super_admin' : 'user';

    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      role,
      tenantId,
      isSuperAdmin: user.isSuperAdmin,
    });

    const refreshToken = signRefreshToken({
      userId: user.id,
      email: user.email,
      role,
      tenantId,
      isSuperAdmin: user.isSuperAdmin,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        jti: `${user.id}_${Date.now()}`,
        userId: user.id,
        tenantId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.fullName,
        role,
        tenantId,
        isSuperAdmin: user.isSuperAdmin,
      },
      accessToken,
      refreshToken,
    });

    setAuthCookies(response, accessToken, refreshToken, cookieConfig);

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
