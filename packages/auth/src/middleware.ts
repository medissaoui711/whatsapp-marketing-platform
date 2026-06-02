import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, verifyRefreshToken, signAccessToken } from './jwt';
import type { JwtPayload } from './types';

export interface AuthResult {
  isAuthenticated: boolean;
  user?: JwtPayload;
  error?: string;
  newAccessToken?: string;
}

export class AuthMiddleware {
  static async getUserFromRequest(req: NextRequest): Promise<AuthResult> {
    let token: string | undefined;

    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (!token) {
      const refreshCookie = req.cookies.get('whm_refresh')?.value;
      if (refreshCookie) {
        const payload = verifyRefreshToken(refreshCookie);
        if (payload) {
          const newAccessToken = signAccessToken({
            userId: payload.userId,
            email: payload.email,
            role: payload.role,
            tenantId: payload.tenantId || payload.organizationId || '',
            isSuperAdmin: payload.isSuperAdmin,
          });
          return { isAuthenticated: true, user: payload, newAccessToken };
        }
        return { isAuthenticated: false, error: 'Invalid or expired session' };
      }
      return { isAuthenticated: false, error: 'No token provided' };
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return { isAuthenticated: false, error: 'Invalid or expired access token' };
    }

    return { isAuthenticated: true, user: payload };
  }

  static async requireAuth(req: NextRequest): Promise<{ response?: NextResponse; user?: JwtPayload }> {
    const auth = await this.getUserFromRequest(req);

    if (!auth.isAuthenticated) {
      return {
        response: NextResponse.json(
          { error: auth.error || 'Unauthorized' },
          { status: 401 }
        ),
      };
    }

    return { user: auth.user };
  }

  static async requireRole(req: NextRequest, allowedRoles: string[]): Promise<{ response?: NextResponse; user?: JwtPayload }> {
    const auth = await this.getUserFromRequest(req);

    if (!auth.isAuthenticated) {
      return {
        response: NextResponse.json(
          { error: auth.error || 'Unauthorized' },
          { status: 401 }
        ),
      };
    }

    if (!allowedRoles.includes(auth.user!.role)) {
      return {
        response: NextResponse.json(
          { error: 'Forbidden: Insufficient permissions' },
          { status: 403 }
        ),
      };
    }

    return { user: auth.user };
  }
}
