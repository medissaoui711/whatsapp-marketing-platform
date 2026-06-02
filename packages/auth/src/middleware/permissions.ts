import { NextRequest, NextResponse } from 'next/server';
import type { RequestWithAuth } from './auth';

export type PermissionChecker = (
  userId: string,
  resource: string,
  action: string
) => Promise<boolean> | boolean;

export function requirePermission(
  checker: PermissionChecker,
  resource: string,
  action: string
) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    const auth = (request as RequestWithAuth).auth;

    if (!auth) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    const hasPermission = await checker(auth.userId, resource, action);
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    return null;
  };
}

export function requireAnyPermission(
  checker: PermissionChecker,
  permissions: string[]
) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    const auth = (request as RequestWithAuth).auth;

    if (!auth) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    for (const perm of permissions) {
      const [resource, action] = perm.split(':');
      if (resource && action && await checker(auth.userId, resource, action)) {
        return null;
      }
    }

    return NextResponse.json(
      { error: 'Insufficient permissions' },
      { status: 403 }
    );
  };
}


