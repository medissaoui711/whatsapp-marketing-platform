import { NextRequest, NextResponse } from 'next/server';

export interface CORSOptions {
  allowedOrigins: string[];
  allowCredentials?: boolean;
  allowedMethods?: string[];
  allowedHeaders?: string[];
  maxAge?: number;
}

export function parseAllowedOrigins(allowedOrigins: string): string[] {
  return allowedOrigins.split(',').map(o => o.trim()).filter(o => o);
}

export function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  if (allowedOrigins.length === 0) return true;
  return allowedOrigins.includes(origin);
}

export function corsMiddleware(options: CORSOptions) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    const origin = request.headers.get('origin');

    if (!origin) return null;

    const isAllowed = isOriginAllowed(origin, options.allowedOrigins)
      || options.allowedOrigins.length === 0;

    if (!isAllowed) return null;

    if (request.method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 204 });
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', String(options.allowCredentials ?? true));
      response.headers.set(
        'Access-Control-Allow-Methods',
        (options.allowedMethods || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']).join(', ')
      );
      response.headers.set(
        'Access-Control-Allow-Headers',
        (options.allowedHeaders || ['Content-Type', 'Authorization', 'X-API-Key', 'X-Organization-ID', 'X-CSRF-Token']).join(', ')
      );
      response.headers.set('Access-Control-Max-Age', String(options.maxAge || 86400));
      return response;
    }

    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', origin);
    if (options.allowCredentials ?? true) {
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    return response;
  };
}


