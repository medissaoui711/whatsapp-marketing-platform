import { NextResponse } from 'next/server';
import { ResponseCookies } from 'next/dist/server/web/spec-extension/cookies';
import { randomBytes } from 'crypto';

const isBrowser = typeof document !== 'undefined';

export const COOKIE_ACCESS_NAME = 'whm_access';
export const COOKIE_REFRESH_NAME = 'whm_refresh';
export const COOKIE_CSRF_NAME = 'whm_csrf';

export interface CookieConfig {
  secure: boolean;
  domain?: string;
  basePath?: string;
}

export function generateCSRFToken(): string {
  const bytes = randomBytes(32);
  return bytes.toString('base64url');
}

export function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string,
  config: CookieConfig,
): void {
  const secure = config.secure;
  const domain = config.domain;
  const basePath = config.basePath || '';
  const accessExpiryMins = parseInt(process.env.JWT_ACCESS_EXPIRY_MINS || '15');
  const refreshExpiryDays = parseInt(process.env.JWT_REFRESH_EXPIRY_DAYS || '7');

  response.cookies.set(COOKIE_ACCESS_NAME, accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: `${basePath}/api`,
    maxAge: accessExpiryMins * 60,
    domain,
  });

  response.cookies.set(COOKIE_REFRESH_NAME, refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: `${basePath}/api/auth/refresh`,
    maxAge: refreshExpiryDays * 24 * 60 * 60,
    domain,
  });

  const csrfToken = generateCSRFToken();
  response.cookies.set(COOKIE_CSRF_NAME, csrfToken, {
    httpOnly: false,
    secure,
    sameSite: 'lax',
    path: `${basePath}/`,
    maxAge: refreshExpiryDays * 24 * 60 * 60,
    domain,
  });
}

export function clearAuthCookies(response: NextResponse, config: CookieConfig): void {
  const domain = config.domain;
  const basePath = config.basePath || '';
  const secure = config.secure;

  response.cookies.set(COOKIE_ACCESS_NAME, '', {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: `${basePath}/api`,
    maxAge: 0,
    domain,
  });

  response.cookies.set(COOKIE_REFRESH_NAME, '', {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: `${basePath}/api/auth/refresh`,
    maxAge: 0,
    domain,
  });

  response.cookies.set(COOKIE_CSRF_NAME, '', {
    httpOnly: false,
    secure,
    sameSite: 'lax',
    path: `${basePath}/`,
    maxAge: 0,
    domain,
  });
}

export function getCSRFToken(): string | undefined {
  if (typeof document === 'undefined') return undefined;

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === COOKIE_CSRF_NAME) {
      return decodeURIComponent(value);
    }
  }
  return undefined;
}

export function getAccessToken(): string | undefined {
  if (typeof document === 'undefined') return undefined;

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === COOKIE_ACCESS_NAME) {
      return decodeURIComponent(value);
    }
  }
  return undefined;
}

export function getRefreshToken(): string | undefined {
  if (typeof document === 'undefined') return undefined;

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === COOKIE_REFRESH_NAME) {
      return decodeURIComponent(value);
    }
  }
  return undefined;
}

export class CookieService {
  private static readonly COOKIE_NAME = 'auth_refresh_token';

  static setRefreshToken(cookies: ResponseCookies, token: string) {
    cookies.set(this.COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });
  }

  static getRefreshToken(cookies: any): string | undefined {
    return cookies.get(this.COOKIE_NAME)?.value;
  }

  static clearRefreshToken(cookies: ResponseCookies) {
    cookies.set(this.COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
    });
  }

  static getClientRefreshToken(): string | null {
    if (!isBrowser) return null;
    const match = document.cookie.match(new RegExp('(^| )' + this.COOKIE_NAME + '=([^;]+)'));
    return match ? match[2] : null;
  }

  static setClientRefreshToken(token: string) {
    if (!isBrowser) return;
    document.cookie = `${this.COOKIE_NAME}=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict; ${process.env.NODE_ENV === 'production' ? 'Secure;' : ''}`;
  }

  static clearClientRefreshToken() {
    if (!isBrowser) return;
    document.cookie = `${this.COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
  }
}


