'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getAccessToken } from '@/lib/cookies';

export interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  roleId?: string;
  isSuperAdmin?: boolean;
  organization?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, subdomain: string) => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => string | null | undefined;
  hasPermission: (resource: string, action: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const rolePermissions: Record<string, string[]> = {
  owner: ['*'],
  admin: [
    'contacts:*', 'campaigns:*', 'integrations:*',
    'users:read', 'users:create', 'users:update',
    'settings:*', 'audit:read',
  ],
  manager: [
    'contacts:read', 'contacts:create', 'contacts:update',
    'campaigns:*', 'integrations:read', 'users:read', 'settings:read',
  ],
  staff: [
    'contacts:read', 'contacts:create', 'contacts:update',
    'campaigns:read', 'integrations:read', 'users:read', 'settings:read',
  ],
  viewer: [
    'contacts:read', 'campaigns:read', 'integrations:read',
    'users:read', 'settings:read',
  ],
};

function checkPermission(role: string, resource: string, action: string): boolean {
  const perms = rolePermissions[role] || [];
  if (perms.includes('*')) return true;
  return perms.includes(`${resource}:*`) || perms.includes(`${resource}:${action}`);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const token = getAccessToken();
        if (token) {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            setUser(data.user);
          } else {
            const refreshRes = await fetch('/api/auth/refresh', { method: 'POST' });
            if (refreshRes.ok) {
              const refreshData = await refreshRes.json();
              setUser(refreshData.user);
            }
          }
        }
      } catch (error) {
        console.error('Session check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const getAccessTokenFn = useCallback(() => {
    return getAccessToken();
  }, []);

  const login = useCallback(async (email: string, password: string, subdomain: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, subdomain }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    setUser(data.user);
    router.push('/dashboard');
  }, [router]);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore network errors on logout
    } finally {
      setUser(null);
      router.push('/login');
    }
  }, [router]);

  const hasPermission = useCallback((resource: string, action: string) => {
    if (!user) return false;
    return checkPermission(user.role, resource, action);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, getAccessToken: getAccessTokenFn, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}


