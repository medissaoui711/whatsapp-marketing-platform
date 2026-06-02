'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';

interface SidebarProps {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    tenantId: string;
    isSuperAdmin: boolean;
  };
}

const menuItems: Record<string, { href: string; label: string; icon: string }[]> = {
  super_admin: [
    { href: '/dashboard', label: 'لوحة التحكم', icon: '📊' },
    { href: '/contacts', label: 'جهات الاتصال', icon: '👥' },
    { href: '/campaigns', label: 'الحملات', icon: '📢' },
    { href: '/accounts', label: 'حسابات واتساب', icon: '💬' },
    { href: '/dev/linkedin', label: 'كشط LinkedIn', icon: '🔗' },
    { href: '/dev/monitoring', label: 'مراقبة الكشط', icon: '📡' },
    { href: '/settings', label: 'الإعدادات', icon: '⚙️' },
    { href: '/settings/webhooks', label: 'Webhooks', icon: '🔗' },
    { href: '/users', label: 'المستخدمين', icon: '👤' },
  ],
  admin: [
    { href: '/dashboard', label: 'لوحة التحكم', icon: '📊' },
    { href: '/contacts', label: 'جهات الاتصال', icon: '👥' },
    { href: '/campaigns', label: 'الحملات', icon: '📢' },
    { href: '/accounts', label: 'حسابات واتساب', icon: '💬' },
    { href: '/dev/linkedin', label: 'كشط LinkedIn', icon: '🔗' },
    { href: '/dev/monitoring', label: 'مراقبة الكشط', icon: '📡' },
    { href: '/settings', label: 'الإعدادات', icon: '⚙️' },
    { href: '/settings/webhooks', label: 'Webhooks', icon: '🔗' },
  ],
  manager: [
    { href: '/dashboard', label: 'لوحة التحكم', icon: '📊' },
    { href: '/contacts', label: 'جهات الاتصال', icon: '👥' },
    { href: '/campaigns', label: 'الحملات', icon: '📢' },
    { href: '/dev/linkedin', label: 'كشط LinkedIn', icon: '🔗' },
  ],
  agent: [
    { href: '/dashboard', label: 'لوحة التحكم', icon: '📊' },
    { href: '/contacts', label: 'جهات الاتصال', icon: '👥' },
    { href: '/dev/linkedin', label: 'كشط LinkedIn', icon: '🔗' },
  ],
};

export function DashboardSidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const role = user.isSuperAdmin ? 'super_admin' : (user.role || 'agent');
  const items = menuItems[role] || menuItems.agent;

  const handleLogout = async () => {
    await apiClient.logout();
    router.push('/login');
  };

  return (
    <aside className="w-64 bg-white border-l border-slate-200 flex flex-col h-screen">
      <div className="p-6 border-b border-slate-200">
        <h1 className="text-xl font-bold text-blue-600">Scraper SaaS</h1>
        <p className="text-xs text-slate-500 mt-1">{user.email}</p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200 space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm font-medium">
            {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name || user.email}</p>
            <p className="text-xs text-slate-500">دور: {role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full text-right text-sm text-red-600 hover:text-red-700 transition-colors px-2 py-1"
        >
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}
