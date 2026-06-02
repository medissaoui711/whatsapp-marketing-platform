import { NextRequest, NextResponse } from 'next/server';

export function securityHeadersMiddleware() {
  return (_request: NextRequest): NextResponse | null => {
    const response = NextResponse.next();

    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set(
      'Permissions-Policy',
      'camera=(), microphone=(self), geolocation=()'
    );
    response.headers.set('X-XSS-Protection', '0');
    response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
    response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');

    return response;
  };
}


