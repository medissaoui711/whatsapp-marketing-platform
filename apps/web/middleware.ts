import { NextRequest, NextResponse } from 'next/server';

const publicPaths = [
  '/api/health',
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/webhooks',
  '/api/monitoring',
  '/api/features/check',
  '/_next',
  '/favicon.ico',
  '/dev',
];

const publicPages = ['/login', '/register', '/forgot-password'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  if (publicPages.some(page => pathname === page)) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    const authHeader = request.headers.get('authorization');
    const accessCookie = request.cookies.get('whm_access')?.value;
    const refreshCookie = request.cookies.get('whm_refresh')?.value;

    if (!authHeader?.startsWith('Bearer ') && !accessCookie && !refreshCookie) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
};
