import { type NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from './jwt';
import { hasPermission, type Permission } from '@repo/shared';

export interface AuthContext {
  userId: string;
  email: string;
  tenantId: string;
  role: string;
  sessionId?: string;
  isSuperAdmin: boolean;
}

export interface ApiHandler<T = any> {
  (request: Request | NextRequest, context: AuthContext, ...args: any[]): Promise<NextResponse<T>>;
}

export function withAuth(handler: ApiHandler): (request: Request | NextRequest, ...args: any[]) => Promise<NextResponse> {
  return async (request: Request | NextRequest, ...args: any[]): Promise<NextResponse> => {
    const authHeader = request.headers.get('authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing or invalid token format' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    if (!payload) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or expired token' },
        { status: 401 }
      );
    }

    const authContext: AuthContext = {
      userId: payload.userId,
      email: payload.email,
      tenantId: payload.tenantId || payload.organizationId || '',
      role: payload.role || (payload.isSuperAdmin ? 'super_admin' : 'user'),
      sessionId: payload.sessionId,
      isSuperAdmin: payload.isSuperAdmin || false,
    };

    return handler(request, authContext, ...args);
  };
}

export function withPermission(permission: Permission) {
  return (handler: ApiHandler) => {
    return withAuth(async (request: NextRequest, context: AuthContext, ...args: any[]) => {
      if (context.isSuperAdmin) {
        return handler(request, context, ...args);
      }
      if (!hasPermission(context.role, permission)) {
        return NextResponse.json(
          { error: `Forbidden: Missing required permission '${permission}'` },
          { status: 403 }
        );
      }
      return handler(request, context, ...args);
    });
  };
}

export function withAuthAndPermission(permission: Permission) {
  return withPermission(permission);
}

export function withOptionalAuth(handler: ApiHandler) {
  return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    const authHeader = request.headers.get('authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      const anonymousContext: AuthContext = {
        userId: '',
        email: '',
        tenantId: '',
        role: 'anonymous',
        isSuperAdmin: false,
      };
      return handler(request, anonymousContext, ...args);
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    if (!payload) {
      const anonymousContext: AuthContext = {
        userId: '',
        email: '',
        tenantId: '',
        role: 'anonymous',
        isSuperAdmin: false,
      };
      return handler(request, anonymousContext, ...args);
    }

    const authContext: AuthContext = {
      userId: payload.userId,
      email: payload.email,
      tenantId: payload.tenantId || payload.organizationId || '',
      role: payload.role || (payload.isSuperAdmin ? 'super_admin' : 'user'),
      sessionId: payload.sessionId,
      isSuperAdmin: payload.isSuperAdmin || false,
    };

    return handler(request, authContext, ...args);
  };
}


