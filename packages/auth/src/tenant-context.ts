import { NextRequest } from 'next/server';
import { verifyAccessToken } from './jwt';

export interface TenantContext {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
  sessionId?: string;
  isSuperAdmin: boolean;
}

export function extractTenantContext(request: NextRequest): TenantContext | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.split(' ')[1];
  const payload = verifyAccessToken(token);

  if (!payload) return null;

  return {
    userId: payload.userId,
    tenantId: payload.organizationId || payload.tenantId,
    role: payload.isSuperAdmin ? 'super_admin' : (payload.role || 'user'),
    email: payload.email,
    sessionId: payload.sessionId,
    isSuperAdmin: payload.isSuperAdmin || false,
  };
}

export function extractTenantContextFromCookies(request: NextRequest): TenantContext | null {
  const accessToken = request.cookies.get('whm_access')?.value;
  if (!accessToken) return null;

  const payload = verifyAccessToken(accessToken);
  if (!payload) return null;

  return {
    userId: payload.userId,
    tenantId: payload.organizationId || payload.tenantId,
    role: payload.isSuperAdmin ? 'super_admin' : (payload.role || 'user'),
    email: payload.email,
    sessionId: payload.sessionId,
    isSuperAdmin: payload.isSuperAdmin || false,
  };
}


