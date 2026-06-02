import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAccessToken } from './jwt';

export type Permission =
  | 'contacts:read' | 'contacts:create' | 'contacts:update' | 'contacts:delete'
  | 'campaigns:read' | 'campaigns:create' | 'campaigns:update' | 'campaigns:delete' | 'campaigns:send'
  | 'integrations:read' | 'integrations:create' | 'integrations:update' | 'integrations:delete'
  | 'users:read' | 'users:create' | 'users:update' | 'users:delete'
  | 'settings:read' | 'settings:update'
  | 'audit:read'
  | 'accounts:read' | 'accounts:create' | 'accounts:update' | 'accounts:delete'
  | 'call_transfers:read' | 'call_transfers:create' | 'call_transfers:write';

const rolePermissions: Record<string, Permission[]> = {
  owner: [
    'contacts:read', 'contacts:create', 'contacts:update', 'contacts:delete',
    'campaigns:read', 'campaigns:create', 'campaigns:update', 'campaigns:delete', 'campaigns:send',
    'integrations:read', 'integrations:create', 'integrations:update', 'integrations:delete',
    'users:read', 'users:create', 'users:update', 'users:delete',
    'settings:read', 'settings:update',
    'audit:read',
    'accounts:read', 'accounts:create', 'accounts:update', 'accounts:delete',
    'call_transfers:read', 'call_transfers:create', 'call_transfers:write',
  ],
  admin: [
    'contacts:read', 'contacts:create', 'contacts:update', 'contacts:delete',
    'campaigns:read', 'campaigns:create', 'campaigns:update', 'campaigns:send',
    'integrations:read', 'integrations:create', 'integrations:update', 'integrations:delete',
    'users:read', 'users:create', 'users:update',
    'settings:read', 'settings:update',
    'audit:read',
    'accounts:read', 'accounts:create', 'accounts:update', 'accounts:delete',
    'call_transfers:read', 'call_transfers:create', 'call_transfers:write',
  ],
  manager: [
    'contacts:read', 'contacts:create', 'contacts:update',
    'campaigns:read', 'campaigns:create', 'campaigns:update', 'campaigns:send',
    'integrations:read',
    'users:read',
    'settings:read',
    'accounts:read',
    'call_transfers:read', 'call_transfers:create',
  ],
  staff: [
    'contacts:read', 'contacts:create', 'contacts:update',
    'campaigns:read',
    'integrations:read',
    'users:read',
    'settings:read',
    'accounts:read',
    'call_transfers:read',
  ],
  viewer: [
    'contacts:read',
    'campaigns:read',
    'integrations:read',
    'users:read',
    'settings:read',
    'accounts:read',
    'call_transfers:read',
  ],
};

export function hasPermission(role: string, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) || false;
}

export function requirePermission(permission: Permission) {
  return async function (request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (!hasPermission(payload.role, permission)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return null;
  };
}


