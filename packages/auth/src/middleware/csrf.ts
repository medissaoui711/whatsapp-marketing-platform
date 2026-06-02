import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_ACCESS_NAME, COOKIE_CSRF_NAME } from '../cookies';

function verifyCSRFToken(request: NextRequest): NextResponse | null {
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    return null;
  }

  const authHeader = request.headers.get('authorization');
  const apiKeyHeader = request.headers.get('x-api-key');

  if (authHeader?.startsWith('Bearer ') || apiKeyHeader) {
    return null;
  }

  const accessCookie = request.cookies.get(COOKIE_ACCESS_NAME);
  if (!accessCookie) {
    return null;
  }

  const csrfCookie = request.cookies.get(COOKIE_CSRF_NAME)?.value;
  const csrfHeader = request.headers.get('x-csrf-token');

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return NextResponse.json(
      { error: 'CSRF token mismatch' },
      { status: 403 },
    );
  }

  return null;
}

export function csrfProtectionMiddleware() {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    return verifyCSRFToken(request);
  };
}

export function withCSRFProtection(
  handler: (
    req: NextRequest,
    params: { params: Record<string, string> }
  ) => Promise<NextResponse>,
): (
  req: NextRequest,
  params: { params: Record<string, string> }
) => Promise<NextResponse> {
  return async (req, params) => {
    const csrfResult = verifyCSRFToken(req);
    if (csrfResult) return csrfResult;
    return handler(req, params);
  };
}


