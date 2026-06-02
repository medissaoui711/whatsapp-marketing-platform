import {
  COOKIE_ACCESS_NAME,
  COOKIE_CSRF_NAME,
  getCSRFToken,
  getAccessToken,
  getRefreshToken,
} from '@repo/auth/cookies';

export { getCSRFToken, getAccessToken, getRefreshToken };

export function addCSRFTokenToRequest(headers: HeadersInit = {}): HeadersInit {
  const csrfToken = getCSRFToken();
  if (csrfToken) {
    return { ...headers, 'X-CSRF-Token': csrfToken };
  }
  return headers;
}

export async function authFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers: Record<string, string> = {};
  const csrfToken = getCSRFToken();
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  const accessToken = getAccessToken();
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const merged = options.headers
    ? { ...headers, ...(typeof options.headers === 'object' && !(options.headers instanceof Headers)
        ? Object.fromEntries(new Headers(options.headers as HeadersInit).entries())
        : {}) }
    : headers;

  return fetch(url, { ...options, headers: merged });
}


