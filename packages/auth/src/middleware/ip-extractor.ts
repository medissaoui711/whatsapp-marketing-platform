import { NextRequest } from 'next/server';

export function extractClientIP(request: NextRequest, trustProxy: boolean): string {
  if (trustProxy) {
    const xff = request.headers.get('x-forwarded-for');
    if (xff) {
      const parts = xff.split(',');
      const ip = parts[0].trim();
      if (ip) return ip;
    }
    const realIP = request.headers.get('x-real-ip');
    if (realIP) return realIP.trim();
  }
  return request.headers.get('x-forwarded-for')?.split(',')[0]
    || request.headers.get('x-real-ip')
    || 'unknown';
}


