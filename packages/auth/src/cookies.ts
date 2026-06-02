import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

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


