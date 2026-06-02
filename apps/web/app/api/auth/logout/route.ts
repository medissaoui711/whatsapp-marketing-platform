import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/db';
import { clearAuthCookies, CookieConfig } from '@repo/auth';

const cookieConfig: CookieConfig = {
  secure: process.env.NODE_ENV === 'production',
};

export async function POST(req: NextRequest) {
  try {
    const { refreshToken } = await req.json();

    if (refreshToken) {
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    }

    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const { verifyAccessToken } = await import('@repo/auth');
      const payload = verifyAccessToken(token);
      if (payload) {
        await prisma.refreshToken.deleteMany({
          where: { userId: payload.userId },
        });
        await prisma.session.deleteMany({
          where: { userId: payload.userId },
        });
      }
    }

    const response = NextResponse.json({ success: true });
    clearAuthCookies(response, cookieConfig);

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
