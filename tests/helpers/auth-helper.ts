import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-32-chars-minimum';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'test-refresh-secret-key-32-chars-minimum';

export interface TestTokenPayload {
  userId: string;
  email: string;
  tenantId: string;
  role?: string;
  isSuperAdmin?: boolean;
}

export function generateAccessToken(payload: TestTokenPayload): string {
  return jwt.sign(
    {
      sub: payload.userId,
      email: payload.email,
      tenantId: payload.tenantId,
      role: payload.role || 'admin',
      isSuperAdmin: payload.isSuperAdmin || false,
    },
    JWT_SECRET,
    { expiresIn: '15m' },
  );
}

export function generateRefreshToken(payload: TestTokenPayload): string {
  return jwt.sign(
    {
      sub: payload.userId,
      email: payload.email,
      type: 'refresh',
    },
    REFRESH_SECRET,
    { expiresIn: '7d' },
  );
}

export function getTestAuthHeaders(payload?: Partial<TestTokenPayload>): Record<string, string> {
  const defaultPayload: TestTokenPayload = {
    userId: 'test-user-id',
    email: 'test@example.com',
    tenantId: 'test-org-id',
    role: 'admin',
    ...payload,
  };

  const token = generateAccessToken(defaultPayload);

  return {
    Authorization: `Bearer ${token}`,
    'X-Tenant-ID': defaultPayload.tenantId,
    'Content-Type': 'application/json',
  };
}
