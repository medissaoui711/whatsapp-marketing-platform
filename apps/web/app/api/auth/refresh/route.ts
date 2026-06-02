import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { verifyRefreshToken, signAccessToken, signRefreshToken } from '@repo/auth';
import { setAuthCookies, clearAuthCookies, CookieConfig } from '@repo/auth';

const cookieConfig: CookieConfig = {
  secure: process.env.NODE_ENV === 'production',
};

export async function POST(req: NextRequest) {
  try {
    const { refreshToken } = await req.json();

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      );
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired refresh token' },
        { status: 401 }
      );
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!storedToken) {
      return NextResponse.json(
        { error: 'Refresh token has been revoked' },
        { status: 401 }
      );
    }

    if (storedToken.expiresAt < new Date()) {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      return NextResponse.json(
        { error: 'Refresh token has expired' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || !user.isActive) {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      const response = NextResponse.json(
        { error: 'User account is deactivated' },
        { status: 403 }
      );
      clearAuthCookies(response, cookieConfig);
      return response;
    }

    const role = payload.role || (user.isSuperAdmin ? 'super_admin' : 'user');
    const tenantId = payload.tenantId || payload.organizationId || '';

    const newAccessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      role,
      tenantId,
      isSuperAdmin: user.isSuperAdmin,
    });

    const newRefreshToken = signRefreshToken({
      userId: user.id,
      email: user.email,
      role,
      tenantId,
      isSuperAdmin: user.isSuperAdmin,
    });

    await prisma.refreshToken.delete({ where: { id: storedToken.id } });

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        jti: `${user.id}_${Date.now()}`,
        userId: user.id,
        tenantId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const response = NextResponse.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });

    setAuthCookies(response, newAccessToken, newRefreshToken, cookieConfig);

    return response;
  } catch (error) {
    console.error('Refresh error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
