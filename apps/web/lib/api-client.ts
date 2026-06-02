const BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

interface LoginData {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    tenantId: string;
    isSuperAdmin: boolean;
  };
  accessToken: string;
  refreshToken: string;
}

class APIClient {
  private accessToken: string | null = null;

  async login(email: string, password: string, _subdomain?: string): Promise<{ ok: boolean; data: LoginData | { error: string } }> {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (response.ok && data.accessToken) {
      this.accessToken = data.accessToken;
      localStorage.setItem('access_token', data.accessToken);
      localStorage.setItem('refresh_token', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
    }

    return { ok: response.ok, data };
  }

  async logout(): Promise<void> {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      await fetch(`${BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // ignore
    }
    this.accessToken = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }

  getAccessToken(): string | null {
    return this.accessToken || localStorage.getItem('access_token');
  }

  getUser(): LoginData['user'] | null {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  }

  async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const token = this.getAccessToken();

    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    if (response.status === 401) {
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) return response;

        const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ refreshToken }),
        });

        const refreshData = await refreshRes.json();

        if (refreshData.accessToken) {
          this.accessToken = refreshData.accessToken;
          localStorage.setItem('access_token', refreshData.accessToken);
          if (refreshData.refreshToken) {
            localStorage.setItem('refresh_token', refreshData.refreshToken);
          }

          const retryHeaders = { ...options.headers };
          (retryHeaders as Record<string, string>)['Authorization'] = `Bearer ${refreshData.accessToken}`;
          return fetch(url, {
            ...options,
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              ...retryHeaders,
            },
          });
        }
      } catch {
        // refresh failed
      }
    }

    return response;
  }
}

export const apiClient = new APIClient();
