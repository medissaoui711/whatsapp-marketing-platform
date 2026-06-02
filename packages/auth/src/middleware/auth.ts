import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '../jwt';
import type { JwtPayload } from '../types';

export interface AuthContext {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
}

export interface RequestWithAuth extends NextRequest {
  auth?: AuthContext;
}

export interface AuthOptions {
  allowAPIKey?: boolean;
}

export function authMiddleware(_options?: AuthOptions) {
  return async (request: NextRequest): Promise<RequestWithAuth | NextResponse> => {
    const authHeader = request.headers.get('authorization');

    let token: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      const cookieToken = request.cookies.get('whm_access')?.value;
      if (cookieToken) token = cookieToken;
    }

    if (!token) {
      return NextResponse.json(
        { error: 'Missing authorization' },
        { status: 401 }
      );
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    (request as RequestWithAuth).auth = {
      userId: payload.userId,
      tenantId: payload.tenantId,
      email: payload.email,
      role: payload.role,
    };

    return request as RequestWithAuth;
  };
}

export function getAuth(request: NextRequest): AuthContext | null {
  return (request as RequestWithAuth).auth || null;
}


