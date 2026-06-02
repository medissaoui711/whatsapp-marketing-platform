'use client';

import { useAuth } from '@/providers/auth-provider';

export function usePermission() {
  const { hasPermission, user } = useAuth();

  const can = (resource: string, action: string): boolean => {
    return hasPermission(resource, action);
  };

  const isOwner = user?.role === 'owner';
  const isAdmin = user?.role === 'admin' || user?.role === 'owner';
  const isManager = ['owner', 'admin', 'manager'].includes(user?.role || '');

  return { can, isOwner, isAdmin, isManager, role: user?.role };
}


