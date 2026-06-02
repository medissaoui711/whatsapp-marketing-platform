import { NextRequest, NextResponse } from 'next/server';

export interface LoggerOptions {
  logBody?: boolean;
  excludePaths?: string[];
}

export function requestLoggerMiddleware(options: LoggerOptions = {}) {
  const excludePaths = options.excludePaths || ['/health', '/metrics'];

  return async (request: NextRequest): Promise<NextResponse | null> => {
    const start = Date.now();
    const url = request.url;
    const method = request.method;

    if (excludePaths.some(path => url.includes(path))) {
      return null;
    }

    const response = NextResponse.next();
    const duration = Date.now() - start;
    response.headers.set('X-Request-Time', String(duration));

    setImmediate(() => {
      console.log(`[${new Date().toISOString()}] ${method} ${url} - ${duration}ms`);
    });

    return response;
  };
}


